/**
 * Prompts for Vertex AI Gemini. Protected tokens are already substituted into the user text.
 */

import { glossaryPrompt, type Glossary } from './glossary.ts'
import type { StringEdit } from './markdown.ts'

const SYSTEM_RULES = [
  'You translate English copy for a Hanafuda Koi-Koi card game.',
  'Preserve markdown structure: headings, lists, tables, emphasis, line breaks, and emoji.',
  'Copy every token of the form @@PH_0@@ exactly once. Do not translate the text those tokens stand for, and do not add tokens.',
  'Do not translate front-matter keys, version headings such as "## [2026.11.0]", or the headings "## Recent changes" and "## Unreleased". Those are not in the fragment.',
  'Keep personal names and studio names as written unless the glossary gives a form.',
  'Return JSON only. Do not wrap it in a code fence.',
].join('\n')

/**
 * @param glossary - Canonical terms.
 * @param locale - Target locale code.
 * @param language - Label such as `Japanese (日本語)`.
 * @param partId - Section id or `body`.
 * @param masked - Fragment with protected tokens.
 * @returns System and user prompts for one markdown fragment.
 */
export const prosePrompt = (args: {
  glossary: Glossary
  locale: string
  language: string
  partId: string
  masked: string
}): { system: string; user: string } => ({
  system: `${SYSTEM_RULES}\nTranslate into ${args.language}.\n${glossaryPrompt(args.glossary, args.locale)}`,
  user: [
    `Translate this markdown fragment into ${args.language}.`,
    `Fragment id: ${args.partId}.`,
    'The JSON shape is {"text":"translated fragment"}.',
    '',
    args.masked,
  ].join('\n'),
})

/**
 * @param glossary - Canonical terms.
 * @param locale - Target locale code.
 * @param language - Label such as `Japanese (日本語)`.
 * @param parts - Several short fragments from one file.
 * @returns A prompt that asks for every fragment id in one JSON object.
 */
export const proseBatchPrompt = (args: {
  glossary: Glossary
  locale: string
  language: string
  parts: Array<{ id: string; masked: string }>
}): { system: string; user: string } => ({
  system: `${SYSTEM_RULES}\nTranslate into ${args.language}.\n${glossaryPrompt(args.glossary, args.locale)}`,
  user: [
    `Translate each markdown fragment into ${args.language}.`,
    'The JSON shape is {"parts":{"fragment id":"translated fragment"}}.',
    'Return every fragment id exactly once.',
    '',
    ...args.parts.flatMap((part) => [`[${part.id}]`, part.masked, '']),
  ].join('\n'),
})

/**
 * @param glossary - Canonical terms.
 * @param locale - Target locale code.
 * @param language - Label such as `French (Français)`.
 * @param entries - Masked UI or front-matter strings.
 * @returns System and user prompts for one batch of strings.
 */
export const stringsPrompt = (args: {
  glossary: Glossary
  locale: string
  language: string
  entries: Array<Pick<StringEdit, 'key' | 'singleLine'> & { masked: string }>
}): { system: string; user: string } => {
  const payload = Object.fromEntries(args.entries.map((entry) => [entry.key, entry.masked]))
  const singleLine = args.entries.filter((entry) => entry.singleLine).map((entry) => entry.key)
  return {
    system: `${SYSTEM_RULES}\nTranslate into ${args.language}.\n${glossaryPrompt(args.glossary, args.locale)}`,
    user: [
      `Translate these UI strings into ${args.language}.`,
      'The JSON shape is {"strings":{"key":"translation"}}.',
      'Return every key exactly once. Translate values only. Do not change the keys.',
      singleLine.length > 0
        ? `These values must stay on one line: ${singleLine.join(', ')}.`
        : '',
      '',
      JSON.stringify(payload, null, 2),
    ]
      .filter((line) => line !== '')
      .join('\n'),
  }
}
