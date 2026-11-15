/**
 * Locale list from `packages/frontend/localization.json`.
 * Content files use `code` (`ja`). UI strings use `file` (`ja-jp.json`).
 */

export type LocaleConfig = {
  name: string
  code: string
  language: string
  file: string
  dir: string
}

export type LocalizationConfig = {
  defaultLocale: string
  locales: LocaleConfig[]
}

const LANGUAGE_NAMES: Record<string, string> = {
  ja: 'Japanese',
  fr: 'French',
  pl: 'Polish',
  ru: 'Russian',
}

/**
 * @param raw - JSON text of `localization.json`.
 * @returns Parsed locale config.
 * @throws When `defaultLocale` or `locales` is missing.
 */
export const parseLocalization = (raw: string): LocalizationConfig => {
  const config = JSON.parse(raw) as LocalizationConfig
  if (!config || typeof config.defaultLocale !== 'string' || !Array.isArray(config.locales)) {
    throw new Error('Invalid localization.json')
  }
  for (const locale of config.locales) {
    if (!locale.code || !locale.file || !locale.name) {
      throw new Error('Invalid locale entry in localization.json')
    }
  }
  return config
}

/**
 * Locales the translator writes. The default locale is the English source.
 *
 * @param config - Parsed `localization.json`.
 * @returns Target locales in file order.
 */
export const targetLocales = (config: LocalizationConfig): LocaleConfig[] =>
  config.locales.filter((locale) => locale.code !== config.defaultLocale)

/**
 * @param locale - Target locale.
 * @returns English language name used in the translator prompt, plus the configured endonym.
 */
export const languageLabel = (locale: LocaleConfig): string => {
  const english = LANGUAGE_NAMES[locale.code] ?? locale.name
  return `${english} (${locale.name})`
}

/**
 * Locale codes that exist in `after` and not in `before`.
 *
 * @param before - Previous config, or null when the file is new.
 * @param after - Config at the commit being translated.
 * @returns New target locale codes.
 */
export const addedLocaleCodes = (
  before: LocalizationConfig | null,
  after: LocalizationConfig,
): string[] => {
  const previous = new Set(before?.locales.map((locale) => locale.code) ?? [])
  return targetLocales(after)
    .map((locale) => locale.code)
    .filter((code) => !previous.has(code))
}
