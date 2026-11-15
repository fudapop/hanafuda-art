/**
 * UI-string plans. Only added, changed, or missing string leaves are translated.
 * Removed English keys are deleted. Untouched keys keep their text and their order.
 */

import { exactTranslation, type Glossary } from './glossary.ts'

export type JsonObject = { [key: string]: JsonValue }
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

export type JsonEdit =
  | { op: 'remove'; path: string[] }
  | { op: 'copy'; path: string[]; value: string | number | boolean | null }
  | { op: 'set'; path: string[]; source: string; keep?: string }

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pathKey = (path: string[]): string => path.join('\0')

const walkLeaves = (
  value: JsonValue,
  path: string[],
  visit: (path: string[], value: JsonValue) => void,
): void => {
  if (Array.isArray(value)) {
    throw new Error(`Arrays in locale JSON are not supported at ${path.join('.') || '(root)'}`)
  }
  if (isObject(value)) {
    for (const key of Object.keys(value)) walkLeaves(value[key], [...path, key], visit)
    return
  }
  visit(path, value)
}

const collectRemovals = (
  source: JsonObject,
  target: JsonObject,
  path: string[],
  push: (edit: JsonEdit) => void,
): void => {
  for (const key of Object.keys(source)) {
    const next = [...path, key]
    if (!(key in target)) {
      push({ op: 'remove', path: next })
      continue
    }
    const sourceChild = source[key]
    const targetChild = target[key]
    if (isObject(sourceChild) && isObject(targetChild)) {
      collectRemovals(sourceChild, targetChild, next, push)
    }
  }
}

const getPath = (root: JsonObject, path: string[]): JsonValue | undefined => {
  let current: JsonValue = root
  for (const key of path) {
    if (!isObject(current) || !(key in current)) return undefined
    current = current[key]
  }
  return current
}

/**
 * @param args.before - English JSON at the previous commit. Null treats every leaf as added.
 * @param args.after - English JSON at the commit being translated.
 * @param args.existing - Current locale JSON, or null when the file is missing.
 * @param args.mode - `full` retranslates every string. `changed` skips strings whose English text and locale value are both unchanged.
 * @param args.glossary - Exact-match terms copied instead of sent to the model.
 * @param args.locale - Target locale code.
 * @returns Edits to apply. Empty when the locale file needs no write.
 */
export const planJsonEdits = (args: {
  before: JsonObject | null
  after: JsonObject
  existing: JsonObject | null
  mode: 'changed' | 'full'
  glossary: Glossary
  locale: string
}): JsonEdit[] => {
  const edits: JsonEdit[] = []
  const seen = new Set<string>()

  const push = (edit: JsonEdit) => {
    const key = pathKey(edit.path)
    if (edit.op !== 'remove' && seen.has(key)) return
    seen.add(key)
    edits.push(edit)
  }

  walkLeaves(args.after, [], (path, value) => {
    const beforeValue = args.before ? getPath(args.before, path) : undefined
    const existingValue = args.existing ? getPath(args.existing, path) : undefined
    const englishChanged = args.before === null || beforeValue !== value
    const missing = existingValue === undefined
    if (args.mode === 'changed' && !englishChanged && !missing) return
    if (typeof value === 'string') {
      const edit: JsonEdit = { op: 'set', path, source: value }
      const exact = exactTranslation(args.glossary, args.locale, value)
      if (exact !== undefined) edit.keep = exact
      push(edit)
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      push({ op: 'copy', path, value })
    }
  })

  const removalRoot: JsonObject | null = args.mode === 'full' ? args.existing : args.before
  if (removalRoot) collectRemovals(removalRoot, args.after, [], push)

  return edits
}

const removePath = (root: JsonObject, path: string[]): void => {
  let current = root
  for (let index = 0; index < path.length - 1; index++) {
    const next = current[path[index]]
    if (!isObject(next)) return
    current = next
  }
  delete current[path[path.length - 1]]
}

const setPath = (root: JsonObject, path: string[], value: JsonValue): void => {
  let current = root
  for (let index = 0; index < path.length - 1; index++) {
    const next = current[path[index]]
    if (!isObject(next)) current[path[index]] = {}
    current = current[path[index]] as JsonObject
  }
  current[path[path.length - 1]] = value
}

/**
 * Apply edits to the existing locale object and serialize it the way the files are stored.
 *
 * @param existingRaw - Current file text, or null to start from an empty object.
 * @param edits - Plan from {@link planJsonEdits}.
 * @param translations - Model output keyed by dotted path. Glossary copies are already on the edits.
 * @returns Pretty-printed JSON with a trailing newline.
 * @throws When a string edit has neither a kept value nor a translation.
 */
export const applyJsonEdits = (
  existingRaw: string | null,
  edits: JsonEdit[],
  translations: Record<string, string>,
): string => {
  const root: JsonObject = existingRaw ? (JSON.parse(existingRaw) as JsonObject) : {}
  const removes = edits
    .filter((edit): edit is { op: 'remove'; path: string[] } => edit.op === 'remove')
    .sort((a, b) => b.path.length - a.path.length)
  for (const edit of removes) removePath(root, edit.path)
  for (const edit of edits) {
    if (edit.op === 'remove') continue
    if (edit.op === 'copy') {
      setPath(root, edit.path, edit.value)
      continue
    }
    const dotted = edit.path.join('.')
    const value = edit.keep !== undefined ? edit.keep : translations[dotted]
    if (value === undefined) throw new Error(`Missing translation for ${dotted}`)
    setPath(root, edit.path, value)
  }
  return JSON.stringify(root, null, 2) + '\n'
}
