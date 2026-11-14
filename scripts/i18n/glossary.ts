/**
 * Hanafuda glossary shared by the translator prompt and exact-string short circuit.
 * Terms are the forms already shipped in the locale files. Incremental runs keep
 * an existing translation when the English string did not change.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type GlossaryTerm = {
  en: string
  ja: string
  fr: string
  pl: string
  ru: string
}

export type Glossary = {
  keepVerbatim: string[]
  identifiers: string[]
  terms: GlossaryTerm[]
}

let cached: Glossary | null = null

/**
 * @param path - Glossary JSON path. Omit to load `scripts/i18n/glossary.json`.
 * @returns Parsed glossary.
 * @throws When the file is missing or is not valid glossary JSON.
 */
export const loadGlossary = (path?: string): Glossary => {
  if (!path && cached) return cached
  const file = path ?? join(dirname(fileURLToPath(import.meta.url)), 'glossary.json')
  const glossary = JSON.parse(readFileSync(file, 'utf8')) as Glossary
  if (!Array.isArray(glossary.terms) || !Array.isArray(glossary.keepVerbatim)) {
    throw new Error(`Invalid glossary: ${file}`)
  }
  if (!path) cached = glossary
  return glossary
}

/**
 * Translation to copy without calling the model, when the whole string is a glossary entry.
 *
 * @param glossary - Loaded glossary.
 * @param locale - Target locale code (`ja`, `fr`, `pl`, `ru`).
 * @param source - English string.
 * @returns The canonical translation, the original when it must be copied, or undefined.
 */
export const exactTranslation = (
  glossary: Glossary,
  locale: string,
  source: string,
): string | undefined => {
  const term = glossary.terms.find((entry) => entry.en === source)
  if (term) {
    const value = term[locale as keyof GlossaryTerm]
    if (typeof value === 'string') return value
  }
  if (glossary.keepVerbatim.includes(source)) return source
  return undefined
}

/**
 * @param glossary - Loaded glossary.
 * @param locale - Target locale code.
 * @returns Prompt text telling the model which forms to use.
 */
export const glossaryPrompt = (glossary: Glossary, locale: string): string => {
  const lines = glossary.terms.flatMap((term) => {
    const value = term[locale as keyof GlossaryTerm]
    return typeof value === 'string' ? [`- ${term.en} → ${value}`] : []
  })
  return [
    'Glossary for this locale. Use these forms for the English term. Do not invent a synonym.',
    ...lines,
    '',
    `Copy these words unchanged wherever they appear: ${glossary.keepVerbatim.join(', ')}.`,
    `Copy these yaku identifiers unchanged: ${glossary.identifiers.join(', ')}.`,
    'Copy hyphenated card ids such as matsu-ni-tsuru unchanged.',
  ].join('\n')
}
