#!/usr/bin/env node

/**
 * Translate English Hanafuda content and UI strings into the other locales.
 *
 * Incremental mode reads a git range and sends only changed markdown sections
 * and changed or missing UI strings. Full mode retranslates every source.
 * Translations are written in the working tree. This script does not commit
 * or push. The GitHub Actions workflow opens a pull request for review.
 *
 * Usage:
 *   node --experimental-strip-types scripts/i18n-translate.ts --mode full --plan
 *   node --experimental-strip-types scripts/i18n-translate.ts --mode changed --base <sha> --head <sha> --plan
 *   node --experimental-strip-types scripts/i18n-translate.ts --mode full
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { loadGlossary } from './i18n/glossary.ts'
import {
  loadPendingTranslations,
  materializePendingTranslations,
  snapshotWithPending,
  type PendingTranslations,
} from './i18n/pending.ts'
import { parseLocalization, targetLocales } from './i18n/locales.ts'
import {
  ENGLISH_CONTENT_PREFIX,
  ENGLISH_JSON_PATH,
  isCommitSha,
  isZeroSha,
  LOCALIZATION_PATH,
} from './i18n/paths.ts'
import { buildPlan, countApiCalls, formatPlan, parseNameStatus, type Plan, type Snapshot } from './i18n/plan.ts'
import { runPlan, type Workspace } from './i18n/run.ts'
import { vertexGenerate, VertexError } from './i18n/vertex.ts'

const HELP = `Usage: node --experimental-strip-types scripts/i18n-translate.ts [options]

--mode changed|full   changed reads --base and --head. full retranslates every source.
--base <sha>          Parent commit for changed mode.
--head <sha>          Checked-out commit for changed mode. Must be HEAD.
--pending-ref <ref>   Open translation branch. When it exists, plan from its merge-base and restore its locale files first.
--plan                Print the plan and do not call Vertex or write files.
--github-output <path>  Append count= and api= for Actions.
--help
`

type Options = {
  mode: 'changed' | 'full'
  base?: string
  head?: string
  pendingRef?: string
  plan: boolean
  githubOutput?: string
}

/**
 * @param argv - Arguments after the script path.
 * @returns Parsed options.
 * @throws When the mode or commit ids are invalid.
 */
const readOptions = (argv: string[]): Options => {
  const { values } = parseArgs({
    args: argv,
    options: {
      mode: { type: 'string', default: 'changed' },
      base: { type: 'string' },
      head: { type: 'string' },
      plan: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      'pending-ref': { type: 'string' },
      'github-output': { type: 'string' },
    },
    strict: true,
  })
  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }
  if (values.mode !== 'changed' && values.mode !== 'full') {
    throw new Error('--mode must be changed or full')
  }
  return {
    mode: values.mode,
    base: values.base,
    head: values.head,
    pendingRef: values['pending-ref'],
    plan: values.plan,
    githubOutput: values['github-output'],
  }
}

const git = (args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const gitShow = (sha: string, filePath: string): string | null => {
  try {
    return git(['show', `${sha}:${filePath}`])
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 128) return null
    throw error
  }
}

const walkMarkdown = (directory: string): string[] => {
  const files: string[] = []
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) files.push(...walkMarkdown(path))
    else if (name.endsWith('.md')) files.push(path.split('\\').join('/'))
  }
  return files
}

const filesystemSnapshot = (): Snapshot => ({
  read: (filePath) => {
    try {
      return readFileSync(filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  },
  listMarkdown: () => walkMarkdown('packages/frontend/content/en').sort(),
})

const gitSnapshot = (sha: string): Snapshot => ({
  read: (filePath) => gitShow(sha, filePath),
  listMarkdown: () =>
    git(['ls-tree', '-r', '--name-only', sha, 'packages/frontend/content/en'])
      .split('\n')
      .filter((line) => line.endsWith('.md'))
      .sort(),
})

const repositoryWorkspace = (): Workspace => ({
  read: (filePath) => {
    try {
      return readFileSync(filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  },
  write: (filePath, contents) => {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, contents)
  },
  remove: (filePath) => {
    rmSync(filePath, { force: true })
  },
})

const writeGithubOutput = (path: string | undefined, plan: Plan): void => {
  if (!path) return
  appendFileSync(path, `count=${plan.files.length}\napi=${countApiCalls(plan)}\n`)
}

const emptyPlan = (mode: 'changed' | 'full'): Plan => ({ mode, locales: [], files: [] })

/**
 * Build the plan for the requested mode.
 * An open translation branch is merged in memory. `--plan` does not write files.
 *
 * @param options - CLI options.
 * @returns The plan and any pending locale merge. A zero parent SHA yields an empty changed plan.
 */
const createPlan = (options: Options): { plan: Plan; pending: PendingTranslations | null } => {
  const glossary = loadGlossary()
  if (options.mode === 'full') {
    return {
      plan: buildPlan({
        mode: 'full',
        changes: [],
        before: null,
        after: filesystemSnapshot(),
        glossary,
      }),
      pending: null,
    }
  }
  if (!options.base || !options.head) throw new Error('changed mode requires --base and --head')
  const pending = options.pendingRef ? loadPendingTranslations(options.pendingRef) : null
  const base = pending?.base ?? options.base
  if (pending) {
    console.log(`Pending translations merged from ${options.pendingRef} through ${pending.base}`)
  }
  if (isZeroSha(base)) {
    console.log(
      '::notice::Previous commit is unavailable, so incremental translation was skipped. Run the workflow manually for a full backfill.',
    )
    return { plan: emptyPlan('changed'), pending: null }
  }
  if (!isCommitSha(base) || !isCommitSha(options.head)) {
    throw new Error('--base and --head must be full commit SHAs')
  }
  const head = git(['rev-parse', 'HEAD']).trim()
  if (options.head !== head) {
    throw new Error(`--head ${options.head} is not the checked out commit ${head}`)
  }
  const diff = git([
    'diff',
    '--name-status',
    '--find-renames',
    base,
    options.head,
    '--',
    ENGLISH_CONTENT_PREFIX,
    ENGLISH_JSON_PATH,
    LOCALIZATION_PATH,
  ])
  const current = filesystemSnapshot()
  return {
    plan: buildPlan({
      mode: 'changed',
      changes: parseNameStatus(diff),
      before: gitSnapshot(base),
      after: pending ? snapshotWithPending(current, pending) : current,
      glossary,
    }),
    pending,
  }
}

const main = async (): Promise<void> => {
  const options = readOptions(process.argv.slice(2))
  const prepared = createPlan(options)
  console.log(formatPlan(prepared.plan))
  writeGithubOutput(options.githubOutput, prepared.plan)
  if (options.plan || prepared.plan.files.length === 0) return
  if (prepared.pending) materializePendingTranslations(prepared.pending)

  const token = process.env.GCP_ACCESS_TOKEN ?? ''
  const projectId = process.env.GCP_PROJECT_ID ?? ''
  const location = process.env.GCP_LOCATION || 'us-central1'
  const model = process.env.GCP_MODEL || 'gemini-2.5-flash'
  if (!token || !projectId) {
    throw new Error('GCP_ACCESS_TOKEN and GCP_PROJECT_ID are required to translate')
  }
  const localization = parseLocalization(readFileSync(LOCALIZATION_PATH, 'utf8'))
  const glossary = loadGlossary()
  await runPlan({
    plan: prepared.plan,
    glossary,
    locales: targetLocales(localization),
    workspace: repositoryWorkspace(),
    delayMs: 200,
    client: (request) =>
      vertexGenerate({
        projectId,
        location,
        model,
        accessToken: token,
        system: request.system,
        user: request.user,
      }),
  })
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  main().catch((error: unknown) => {
    if (error instanceof VertexError) {
      console.error(error.message)
    } else {
      console.error(error instanceof Error ? error.message : error)
    }
    process.exit(1)
  })
}
