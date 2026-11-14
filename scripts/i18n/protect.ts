/**
 * Mask markdown and message syntax that a translation must copy unchanged:
 * code, URLs, Nuxt Content attribute blocks, placeholders, and card ids.
 */

const TOKEN_PATTERN = /@@PH_\d+@@/

export type MaskedText = {
  masked: string
  tokens: string[]
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * @param input - Source text that may contain protected spans.
 * @param identifiers - Yaku ids to mask wherever they appear as whole words.
 * @returns Text with protected spans replaced by `@@PH_n@@` tokens, and the originals.
 * @throws When the source already contains a token prefix.
 */
export const maskText = (input: string, identifiers: string[] = []): MaskedText => {
  if (input.includes('@@PH_')) {
    throw new Error('Source contains a protected-token prefix')
  }
  const tokens: string[] = []
  const protect = (value: string): string => {
    const token = `@@PH_${tokens.length}@@`
    tokens.push(value)
    return token
  }

  let text = input
  text = text.replace(/```[\s\S]*?```/g, (match) => protect(match))
  text = text.replace(/`[^`\n]+`/g, (match) => protect(match))
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, url: string) => {
    return `![${alt}](${protect(url)})`
  })
  text = text.replace(
    /\[([^\]]*)\]\(([^)\s]+)\)(\{[^}\n]*\})?/g,
    (_match, label: string, url: string, attrs: string | undefined) => {
      return `[${label}](${protect(url)})${attrs ? protect(attrs) : ''}`
    },
  )
  text = text.replace(/<https?:\/\/[^>\s]+>/g, (match) => protect(match))
  text = text.replace(/https?:\/\/[^\s)<]+/g, (match) => protect(match))
  text = text.replace(/<\/?[A-Za-z][^>\n]*>/g, (match) => protect(match))
  text = text.replace(/::[A-Za-z][\w-]*/g, (match) => protect(match))
  text = text.replace(/:[A-Za-z][\w-]*\{[^}\n]*\}/g, (match) => protect(match))
  if (identifiers.length > 0) {
    const body = identifiers.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|')
    text = text.replace(new RegExp(`\\b(?:${body})\\b`, 'g'), (match) => protect(match))
  }
  text = text.replace(/\b[a-z]+(?:-[a-z0-9]+){2,}\b/g, (match) => protect(match))
  text = text.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, (match) => protect(match))
  return { masked: text, tokens }
}

/**
 * @param masked - Model output that must still contain every token.
 * @param tokens - Originals from {@link maskText}, in order.
 * @returns Text with tokens restored.
 * @throws When a token is missing, duplicated, or invented.
 */
export const unmaskText = (masked: string, tokens: string[]): string => {
  let text = masked
  for (let index = 0; index < tokens.length; index++) {
    const token = `@@PH_${index}@@`
    const count = text.split(token).length - 1
    if (count !== 1) {
      throw new Error(`Translation must keep ${token} exactly once, found ${count}`)
    }
    text = text.replace(token, () => tokens[index])
  }
  if (TOKEN_PATTERN.test(text)) {
    throw new Error('Translation has an unexpected protected token')
  }
  return text
}

const multiset = (values: string[]): string[] => [...values].sort()

const braceGroups = (text: string): string[] =>
  [...text.matchAll(/\{[^{}\n]+\}/g)].map((match) => match[0])

const urls = (text: string): string[] => [...text.matchAll(/https?:\/\/[^\s)<]+/g)].map((match) => match[0])

const emojis = (text: string): string[] =>
  [...text.matchAll(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu)].map(
    (match) => match[0],
  )

/**
 * Compare syntax that must survive translation. Order may change. Counts may not.
 *
 * @param source - Unmasked English.
 * @param translated - Unmasked translation.
 * @throws When a URL, brace group, or emoji was added or dropped.
 */
export const assertPreserved = (source: string, translated: string): void => {
  const checks: Array<[string, string[]]> = [
    ['URL', urls(source)],
    ['brace group', braceGroups(source)],
    ['emoji', emojis(source)],
  ]
  for (const [label, expected] of checks) {
    const actual = label === 'URL' ? urls(translated) : label === 'emoji' ? emojis(translated) : braceGroups(translated)
    const left = multiset(expected).join('\n')
    const right = multiset(actual).join('\n')
    if (left !== right) {
      throw new Error(`Translation changed ${label}s.\nExpected:\n${left || '(none)'}\nActual:\n${right || '(none)'}`)
    }
  }
}
