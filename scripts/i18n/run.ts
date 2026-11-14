/**
 * Apply a translation plan. Model calls are injected so tests can run without Vertex.
 * Files are written only after every call for the plan has succeeded.
 */

import { applyJsonEdits, type JsonEdit } from './json-locale.ts'
import { assembleMarkdown, type MarkdownUpdate } from './markdown.ts'
import { proseBatchPrompt, prosePrompt, stringsPrompt } from './prompt.ts'
import { assertPreserved, maskText, unmaskText } from './protect.ts'
import { assertTranslationTarget } from './paths.ts'
import type { Glossary } from './glossary.ts'
import { languageLabel, type LocaleConfig } from './locales.ts'
import type { Plan } from './plan.ts'
import { VertexError } from './vertex.ts'

const STRING_BATCH = 40
const PROSE_BATCH_CHARS = 6000

export type ModelRequest = {
  system: string
  user: string
  echo?:
    | { kind: 'prose'; masked: string }
    | { kind: 'prose-batch'; parts: Array<{ id: string; masked: string }> }
    | { kind: 'strings'; entries: Array<{ key: string; masked: string }> }
}

export type ModelClient = (request: ModelRequest) => Promise<string>

export type Workspace = {
  read(path: string): string | null
  write(path: string, contents: string): void
  remove(path: string): void
}

type Pending =
  | { type: 'write'; path: string; contents: string }
  | { type: 'delete'; path: string }

const parseModelJson = (text: string): unknown => {
  let trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(trimmed)
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size))
  return batches
}

/**
 * Call the model and accept the reply. A validation failure is sent back once.
 * Authentication and bad-request errors are not retried.
 *
 * @param client - Vertex client, or a fake in tests.
 * @param system - System prompt.
 * @param user - User prompt.
 * @param accept - Parse and validate the model text.
 * @returns The accepted value.
 */
const complete = async <T>(
  client: ModelClient,
  system: string,
  user: string,
  echo: ModelRequest['echo'],
  accept: (text: string) => T,
): Promise<T> => {
  let hint = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompted = hint
      ? `${user}\n\nPrevious attempt failed validation: ${hint}\nReturn corrected JSON only.`
      : user
    try {
      const text = await client({ system, user: prompted, echo })
      return accept(text)
    } catch (error) {
      if (
        error instanceof VertexError &&
        (error.status === 400 || error.status === 401 || error.status === 403)
      ) {
        throw error
      }
      hint = error instanceof Error ? error.message : String(error)
      if (attempt === 2) throw error
    }
  }
  throw new Error('Translation retries exhausted')
}

const acceptProse = (source: string, tokens: string[], text: string): string => {
  const parsed = parseModelJson(text) as { text?: unknown }
  if (!parsed || typeof parsed.text !== 'string') throw new Error('Model JSON is missing text')
  const translated = unmaskText(parsed.text, tokens)
  assertPreserved(source, translated)
  if (!source.trim() && translated.trim()) throw new Error('Translation added text for an empty fragment')
  if (source.trim() && !translated.trim()) throw new Error('Translation is empty')
  return translated.trim()
}

const acceptStrings = (
  entries: Array<{ key: string; source: string; tokens: string[]; singleLine?: boolean }>,
  text: string,
): Record<string, string> => {
  const parsed = parseModelJson(text) as { strings?: Record<string, unknown> }
  const strings = parsed?.strings
  if (!strings || typeof strings !== 'object') throw new Error('Model JSON is missing strings')
  const result: Record<string, string> = {}
  for (const entry of entries) {
    const value = strings[entry.key]
    if (typeof value !== 'string') throw new Error(`Model JSON is missing ${entry.key}`)
    const translated = unmaskText(value, entry.tokens)
    assertPreserved(entry.source, translated)
    if (entry.singleLine && translated.includes('\n')) {
      throw new Error(`${entry.key} must stay on one line`)
    }
    if (entry.source.trim() && !translated.trim()) throw new Error(`${entry.key} translated to an empty string`)
    result[entry.key] = translated
  }
  const extra = Object.keys(strings).filter((key) => !entries.some((entry) => entry.key === key))
  if (extra.length > 0) throw new Error(`Model JSON has extra keys: ${extra.join(', ')}`)
  return result
}

const localeConfig = (code: string, locales: LocaleConfig[]): LocaleConfig => {
  const locale = locales.find((item) => item.code === code)
  if (!locale) throw new Error(`Unknown locale ${code}`)
  return locale
}

const translateMarkdown = async (
  file: MarkdownUpdate,
  glossary: Glossary,
  locales: LocaleConfig[],
  client: ModelClient,
  delayMs: number,
): Promise<string> => {
  const locale = localeConfig(file.locale, locales)
  const language = languageLabel(locale)
  const prose: Record<string, string> = {}
  const strings: Record<string, string> = {}

  const preparedProse = file.prose.map((part) => {
    const masked = maskText(part.source, glossary.identifiers)
    return { id: part.id, source: part.source, masked: masked.masked, tokens: masked.tokens }
  })
  const proseBatches: Array<typeof preparedProse> = []
  let currentBatch: typeof preparedProse = []
  let currentSize = 0
  for (const part of preparedProse) {
    if (currentBatch.length > 0 && currentSize + part.source.length > PROSE_BATCH_CHARS) {
      proseBatches.push(currentBatch)
      currentBatch = []
      currentSize = 0
    }
    currentBatch.push(part)
    currentSize += part.source.length
  }
  if (currentBatch.length > 0) proseBatches.push(currentBatch)

  for (const batch of proseBatches) {
    if (batch.length === 1) {
      const part = batch[0]
      if (!part) throw new Error('Empty prose batch')
      const prompt = prosePrompt({
        glossary,
        locale: file.locale,
        language,
        partId: part.id,
        masked: part.masked,
      })
      console.log(`translate ${file.locale} ${file.targetPath} prose ${part.id}`)
      prose[part.id] = await complete(
        client,
        prompt.system,
        prompt.user,
        { kind: 'prose', masked: part.masked },
        (text) => acceptProse(part.source, part.tokens, text),
      )
    } else {
      const prompt = proseBatchPrompt({
        glossary,
        locale: file.locale,
        language,
        parts: batch.map((part) => ({ id: part.id, masked: part.masked })),
      })
      console.log(`translate ${file.locale} ${file.targetPath} prose ${batch.map((part) => part.id).join(', ')}`)
      const translated = await complete(
        client,
        prompt.system,
        prompt.user,
        {
          kind: 'prose-batch',
          parts: batch.map((part) => ({ id: part.id, masked: part.masked })),
        },
        (text) => {
          const parsed = parseModelJson(text) as { parts?: Record<string, unknown> }
          const parts = parsed?.parts
          if (!parts || typeof parts !== 'object') throw new Error('Model JSON is missing parts')
          const result: Record<string, string> = {}
          for (const part of batch) {
            const value = parts[part.id]
            if (typeof value !== 'string') throw new Error(`Model JSON is missing part ${part.id}`)
            result[part.id] = acceptProse(part.source, part.tokens, JSON.stringify({ text: value }))
          }
          return result
        },
      )
      Object.assign(prose, translated)
    }
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const pending = file.strings.filter((edit) => edit.keep === undefined)
  for (const edit of file.strings) {
    if (edit.keep !== undefined) strings[edit.key] = edit.keep
  }
  if (pending.length > 0) {
    const prepared = pending.map((edit) => {
      const masked = maskText(edit.source, glossary.identifiers)
      return { ...edit, masked: masked.masked, tokens: masked.tokens }
    })
    const prompt = stringsPrompt({
      glossary,
      locale: file.locale,
      language,
      entries: prepared.map((edit) => ({ key: edit.key, masked: edit.masked, singleLine: edit.singleLine })),
    })
    console.log(`translate ${file.locale} ${file.targetPath} strings ${prepared.length}`)
    const translated = await complete(
      client,
      prompt.system,
      prompt.user,
      { kind: 'strings', entries: prepared.map((edit) => ({ key: edit.key, masked: edit.masked })) },
      (text) => acceptStrings(prepared, text),
    )
    Object.assign(strings, translated)
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return assembleMarkdown(file, { strings, prose })
}

const translateJson = async (
  edits: JsonEdit[],
  localeCode: string,
  targetPath: string,
  glossary: Glossary,
  locales: LocaleConfig[],
  client: ModelClient,
  delayMs: number,
): Promise<Record<string, string>> => {
  const locale = localeConfig(localeCode, locales)
  const language = languageLabel(locale)
  const translations: Record<string, string> = {}
  const pending = edits.filter((edit): edit is Extract<JsonEdit, { op: 'set' }> => edit.op === 'set' && edit.keep === undefined)
  for (const batch of chunk(pending, STRING_BATCH)) {
    const prepared = batch.map((edit) => {
      const masked = maskText(edit.source, glossary.identifiers)
      return {
        key: edit.path.join('.'),
        source: edit.source,
        masked: masked.masked,
        tokens: masked.tokens,
        singleLine: !edit.source.includes('\n'),
      }
    })
    const prompt = stringsPrompt({
      glossary,
      locale: localeCode,
      language,
      entries: prepared,
    })
    console.log(`translate ${localeCode} ${targetPath} strings ${prepared.length}`)
    const translated = await complete(
      client,
      prompt.system,
      prompt.user,
      { kind: 'strings', entries: prepared.map((edit) => ({ key: edit.key, masked: edit.masked })) },
      (text) => acceptStrings(prepared, text),
    )
    Object.assign(translations, translated)
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return translations
}

/**
 * Translate every file in the plan and write the results.
 *
 * @param args.plan - Output of `buildPlan`.
 * @param args.client - Model client. Tests pass an echo. The CLI passes Vertex.
 * @param args.workspace - File reader and writer. Production uses the repository working tree.
 * @param args.glossary - Canonical terms. Also supplies identifiers to mask.
 * @param args.locales - Target locale metadata, used for prompt language names.
 * @param args.delayMs - Pause between model calls. Tests use 0.
 * @returns Paths written and deleted.
 * @throws When a model reply drops protected syntax, or a path is an English source.
 */
export const runPlan = async (args: {
  plan: Plan
  client: ModelClient
  workspace: Workspace
  glossary: Glossary
  locales: LocaleConfig[]
  delayMs?: number
}): Promise<{ written: string[]; deleted: string[] }> => {
  const delayMs = args.delayMs ?? 0
  const pending: Pending[] = []

  for (const file of args.plan.files) {
    const target = file.targetPath
    assertTranslationTarget(target)
    if (file.kind === 'delete') {
      if (args.workspace.read(target) !== null) pending.push({ type: 'delete', path: target })
      continue
    }
    const contents =
      file.kind === 'markdown'
        ? await translateMarkdown(file, args.glossary, args.locales, args.client, delayMs)
        : applyJsonEdits(
            file.existingRaw,
            file.edits,
            await translateJson(file.edits, file.locale, file.targetPath, args.glossary, args.locales, args.client, delayMs),
          )
    if (args.workspace.read(target) === contents) {
      console.log(`unchanged ${target}`)
      continue
    }
    pending.push({ type: 'write', path: target, contents })
  }

  const written: string[] = []
  const deleted: string[] = []
  for (const item of pending) {
    if (item.type === 'delete') {
      args.workspace.remove(item.path)
      deleted.push(item.path)
      console.log(`delete ${item.path}`)
      continue
    }
    args.workspace.write(item.path, item.contents)
    written.push(item.path)
    console.log(`write ${item.path}`)
  }
  return { written, deleted }
}
