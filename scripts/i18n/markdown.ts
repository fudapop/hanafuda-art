/**
 * Markdown content plans. Versioned changelog sections are updated one heading
 * at a time. Other pages are translated as a whole body, with front matter
 * strings handled separately so dates and keys stay put.
 */

import { exactTranslation, type Glossary } from './glossary.ts'

export type FrontSlot = {
  path: string
  lineIndex: number
  kind: 'scalar' | 'item'
  quoted: boolean
  value: string
  translate: boolean
}

export type StringEdit = {
  key: string
  source: string
  keep?: string
  singleLine?: boolean
}

export type ProseEdit = {
  id: string
  source: string
}

export type MarkdownPiece =
  | { type: 'literal'; text: string }
  | { type: 'prose'; id: string; prefix: string; suffix: string }

export type FrontPlan =
  | { type: 'none' }
  | { type: 'keep'; block: string }
  | { type: 'build'; inner: string; slots: FrontSlot[] }

export type MarkdownUpdate = {
  kind: 'markdown'
  locale: string
  sourcePath: string
  targetPath: string
  front: FrontPlan
  strings: StringEdit[]
  prose: ProseEdit[]
  pieces: MarkdownPiece[]
}

type Section = {
  id: string
  headingLine: string
  body: string
  raw: string
}

const unquote = (raw: string): { value: string; quoted: boolean } => {
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    const quote = trimmed[0]
    const inner = trimmed.slice(1, -1)
    const value = quote === '"' ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner
    return { value, quoted: true }
  }
  return { value: trimmed, quoted: false }
}

const isSkippable = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) || /^(true|false|null|\d+)$/.test(value)

/**
 * @param inner - YAML between the front-matter markers, without the `---` lines.
 * @returns Scalar strings and list items, with dates marked as not translatable.
 * @throws When a line is not a scalar or a list item.
 */
export const parseFrontSlots = (inner: string): FrontSlot[] => {
  const lines = inner.split('\n')
  const slots: FrontSlot[] = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (!line.trim()) continue
    const scalar = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/)
    if (!scalar) throw new Error(`Unsupported front matter line: ${line}`)
    const key = scalar[1]
    const rest = scalar[2]
    if (rest === '') {
      let item = 0
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index++
        const parsed = unquote(lines[index].replace(/^\s+-\s+/, ''))
        slots.push({
          path: `${key}.${item}`,
          lineIndex: index,
          kind: 'item',
          quoted: parsed.quoted,
          value: parsed.value,
          translate: parsed.value.length > 0,
        })
        item++
      }
      continue
    }
    const parsed = unquote(rest)
    slots.push({
      path: key,
      lineIndex: index,
      kind: 'scalar',
      quoted: parsed.quoted,
      value: parsed.value,
      translate: parsed.value.length > 0 && !isSkippable(parsed.value),
    })
  }
  return slots
}

const formatYaml = (value: string, quoted: boolean): string => {
  const mustQuote =
    quoted || value.trim() !== value || value === '' || /[:#&*!|>%@`'"\n,{}\[\]]/.test(value)
  if (!mustQuote) return value
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Substitute translated strings into a copy of the English front matter.
 *
 * @param inner - English YAML between the markers.
 * @param slots - Fields from {@link parseFrontSlots}.
 * @param values - Translations keyed by slot path. Non-translatable slots are ignored.
 * @returns YAML text using the English key order and date lines.
 * @throws When a translatable slot has no value, or a value contains a newline.
 */
export const renderFrontMatter = (
  inner: string,
  slots: FrontSlot[],
  values: Record<string, string>,
): string => {
  const lines = inner.split('\n')
  for (const slot of slots) {
    if (!slot.translate) continue
    const value = values[slot.path]
    if (value === undefined) throw new Error(`Missing translation for front matter ${slot.path}`)
    if (value.includes('\n')) throw new Error(`Front matter ${slot.path} must be a single line`)
    const line = lines[slot.lineIndex]
    if (slot.kind === 'scalar') {
      const prefix = line.match(/^\s*[A-Za-z][A-Za-z0-9_-]*:\s*/)?.[0]
      if (!prefix) throw new Error(`Cannot rewrite front matter line: ${line}`)
      lines[slot.lineIndex] = prefix + formatYaml(value, slot.quoted)
    } else {
      const prefix = line.match(/^\s*-\s*/)?.[0]
      if (!prefix) throw new Error(`Cannot rewrite front matter item: ${line}`)
      lines[slot.lineIndex] = prefix + formatYaml(value, slot.quoted)
    }
  }
  return lines.join('\n')
}

type SplitDoc = {
  block: string
  inner: string | null
  body: string
}

const splitDoc = (markdown: string): SplitDoc => {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return { block: '', inner: null, body: markdown }
  return { block: match[0], inner: match[1], body: markdown.slice(match[0].length) }
}

const sectionId = (heading: string): string => {
  if (/^## Unreleased\b/.test(heading)) return 'unreleased'
  const version = heading.match(/^## \[([^\]]+)\]/)
  if (!version) throw new Error(`Heading is not a stable version id: ${heading}`)
  return version[1]
}

/**
 * Split changelog-style markdown on `## Unreleased` and `## [version]` headings.
 *
 * @param markdown - Body after front matter.
 * @returns Null when there is no such heading, or any `##` heading is ordinary prose.
 */
export const splitStableSections = (
  markdown: string,
): { preamble: string; sections: Section[] } | null => {
  const matches = [...markdown.matchAll(/^## [^\n]+/gm)]
  if (matches.length === 0) return null
  if (!matches.every((match) => /^## (?:Unreleased|\[[^\]]+\])/.test(match[0]))) return null
  const preamble = markdown.slice(0, matches[0].index ?? 0)
  const sections = matches.map((match, index) => {
    const start = match.index ?? 0
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? markdown.length) : markdown.length
    const raw = markdown.slice(start, end)
    const headingLine = match[0]
    let body = raw.slice(headingLine.length)
    if (body.startsWith('\n')) body = body.slice(1)
    return { id: sectionId(headingLine), headingLine, body, raw }
  })
  const ids = new Set<string>()
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`Duplicate section id ${section.id}`)
    ids.add(section.id)
  }
  return { preamble, sections }
}

const norm = (value: string): string => value.replace(/^\n+/, '').replace(/\s+$/, '')

const classifyString = (
  glossary: Glossary,
  locale: string,
  source: string,
  existing: string | undefined,
  englishChanged: boolean,
  mode: 'changed' | 'full',
): StringEdit => {
  const edit: StringEdit = { key: '', source, singleLine: true }
  if (mode === 'changed' && !englishChanged && existing !== undefined) {
    edit.keep = existing
    return edit
  }
  const exact = exactTranslation(glossary, locale, source)
  if (exact !== undefined) edit.keep = exact
  return edit
}

const slotMap = (slots: FrontSlot[]): Map<string, string> =>
  new Map(slots.filter((slot) => slot.translate).map((slot) => [slot.path, slot.value]))

/**
 * Decide which parts of one English markdown file need a translation for one locale.
 *
 * @returns A write plan, or null when this locale file can stay as it is.
 * Null `after` deletes the locale file when it exists.
 */
export const planMarkdownFile = (args: {
  mode: 'changed' | 'full'
  locale: string
  sourcePath: string
  targetPath: string
  before: string | null
  after: string | null
  existing: string | null
  glossary: Glossary
}): MarkdownUpdate | { kind: 'delete'; targetPath: string } | null => {
  if (args.after === null) {
    return args.existing === null ? null : { kind: 'delete', targetPath: args.targetPath }
  }

  const beforeDoc = args.before === null ? null : splitDoc(args.before)
  const afterDoc = splitDoc(args.after)
  const existingDoc = args.existing === null ? null : splitDoc(args.existing)
  const mode = args.mode

  const frontUnchanged =
    mode === 'changed' && (beforeDoc?.inner ?? null) === afterDoc.inner && existingDoc?.block
  const front: FrontPlan = !afterDoc.inner
    ? { type: 'none' }
    : frontUnchanged
      ? { type: 'keep', block: existingDoc.block }
      : { type: 'build', inner: afterDoc.inner, slots: parseFrontSlots(afterDoc.inner) }

  const strings: StringEdit[] = []
  if (front.type === 'build') {
    const beforeSlots = beforeDoc?.inner ? slotMap(parseFrontSlots(beforeDoc.inner)) : new Map()
    const existingSlots = existingDoc?.inner ? slotMap(parseFrontSlots(existingDoc.inner)) : new Map()
    for (const slot of front.slots) {
      if (!slot.translate) continue
      const englishChanged = !beforeSlots.has(slot.path) || beforeSlots.get(slot.path) !== slot.value
      const existing = existingSlots.get(slot.path)
      const edit = classifyString(
        args.glossary,
        args.locale,
        slot.value,
        existing,
        englishChanged || existing === undefined,
        mode,
      )
      edit.key = slot.path
      edit.source = slot.value
      strings.push(edit)
    }
  }

  const pieces: MarkdownPiece[] = []
  const prose: ProseEdit[] = []
  let dirty = front.type === 'build' || args.existing === null

  const afterSections = splitStableSections(afterDoc.body)
  const beforeSections = beforeDoc ? splitStableSections(beforeDoc.body) : null
  const existingSections = existingDoc ? splitStableSections(existingDoc.body) : null
  const useSections = afterSections !== null && (existingDoc === null || existingSections !== null)

  if (useSections && afterSections) {
    const beforeById = new Map((beforeSections?.sections ?? []).map((section) => [section.id, section]))
    const existingById = new Map((existingSections?.sections ?? []).map((section) => [section.id, section]))
    const keepPreamble =
      mode === 'changed' &&
      existingSections !== null &&
      (beforeSections?.preamble ?? null) === afterSections.preamble
    if (keepPreamble && existingSections) {
      pieces.push({ type: 'literal', text: existingSections.preamble })
    } else if (norm(afterSections.preamble).length > 0) {
      prose.push({ id: 'preamble', source: norm(afterSections.preamble) })
      pieces.push({ type: 'prose', id: 'preamble', prefix: '', suffix: '\n\n' })
      dirty = true
    } else {
      pieces.push({ type: 'literal', text: afterSections.preamble })
    }

    const afterIds = new Set(afterSections.sections.map((section) => section.id))
    if ([...existingById.keys()].some((id) => !afterIds.has(id))) dirty = true

    for (const section of afterSections.sections) {
      const previous = beforeById.get(section.id)
      const current = existingById.get(section.id)
      const bodyChanged = !previous || norm(previous.body) !== norm(section.body)
      const canKeep = mode === 'changed' && current && !bodyChanged
      if (canKeep && current) {
        if (current.headingLine === section.headingLine) {
          pieces.push({ type: 'literal', text: current.raw })
        } else {
          const rest = current.raw.slice(current.headingLine.length)
          pieces.push({ type: 'literal', text: section.headingLine + rest })
          dirty = true
        }
        continue
      }
      prose.push({ id: section.id, source: norm(section.body) })
      pieces.push({
        type: 'prose',
        id: section.id,
        prefix: `${section.headingLine}\n\n`,
        suffix: '\n\n',
      })
      dirty = true
    }
  } else {
    const beforeBody = beforeDoc?.body ?? null
    const bodyChanged = beforeBody === null || norm(beforeBody) !== norm(afterDoc.body)
    const keepBody = mode === 'changed' && existingDoc !== null && !bodyChanged
    if (keepBody && existingDoc) {
      pieces.push({ type: 'literal', text: existingDoc.body })
    } else {
      const leading = afterDoc.body.startsWith('\n') ? '\n' : ''
      prose.push({ id: 'body', source: norm(afterDoc.body) })
      pieces.push({ type: 'prose', id: 'body', prefix: leading, suffix: '\n' })
      dirty = true
    }
  }

  if (strings.some((edit) => edit.keep === undefined)) dirty = true
  if (!dirty) return null

  return {
    kind: 'markdown',
    locale: args.locale,
    sourcePath: args.sourcePath,
    targetPath: args.targetPath,
    front,
    strings,
    prose,
    pieces,
  }
}

/**
 * @param update - Markdown plan from {@link planMarkdownFile}.
 * @param translations - Prose and front-matter strings keyed by their ids.
 * @returns The locale markdown file, ending in a single newline.
 */
export const assembleMarkdown = (
  update: MarkdownUpdate,
  translations: { strings: Record<string, string>; prose: Record<string, string> },
): string => {
  const chunks: string[] = []
  for (const piece of update.pieces) {
    if (piece.type === 'literal') {
      chunks.push(piece.text)
      continue
    }
    const text = translations.prose[piece.id]
    if (text === undefined) throw new Error(`Missing prose translation ${piece.id}`)
    if (piece.id !== 'body' && text.trimStart().startsWith('## [')) {
      throw new Error(`Translation of ${piece.id} added a version heading`)
    }
    chunks.push(`${piece.prefix}${text.replace(/\s+$/, '')}${piece.suffix}`)
  }
  let body = chunks.join('')
  body = body.replace(/\s+$/, '') + '\n'

  if (update.front.type === 'none') return body
  if (update.front.type === 'keep') return update.front.block + body
  const inner = renderFrontMatter(update.front.inner, update.front.slots, translations.strings)
  return `---\n${inner.replace(/\n$/, '')}\n---\n${body}`
}
