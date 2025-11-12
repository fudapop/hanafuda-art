/**
 * Shared Translation Utilities
 *
 * Common utilities and configuration for translation scripts.
 * Provides a single source of truth for supported locales and shared functionality.
 */

import { existsSync } from '@std/fs/exists'
import { dirname, fromFileUrl, join } from '@std/path'

/**
 * Locale configuration interface
 */
export interface LocaleConfig {
  name: string
  code: string
  language: string
  file: string
  dir: string
}

/**
 * Localization configuration interface
 */
export interface LocalizationConfig {
  defaultLocale: string
  locales: LocaleConfig[]
}

/**
 * Translation mode types
 */
export const TranslationMode = {
  CONTENT: 'content',
  JSON: 'json',
} as const

export type TranslationMode = (typeof TranslationMode)[keyof typeof TranslationMode]

/**
 * Cache for the localization configuration
 */
let localizationConfig: LocalizationConfig | null = null

/**
 * Load localization configuration from localization.json
 */
function loadLocalizationConfig(): LocalizationConfig {
  if (localizationConfig) {
    return localizationConfig
  }

  try {
    const currentFileUrl = import.meta.url
    const currentDir = dirname(fromFileUrl(currentFileUrl))
    const projectRoot = join(currentDir, '..')
    const configPath = join(projectRoot, 'localization.json')

    if (!existsSync(configPath)) {
      throw new Error(`Localization config file not found at: ${configPath}`)
    }

    const configContent = Deno.readTextFileSync(configPath)
    localizationConfig = JSON.parse(configContent) as LocalizationConfig

    // Validate the configuration
    if (!localizationConfig.locales || !Array.isArray(localizationConfig.locales)) {
      throw new Error('Invalid localization config: missing or invalid locales array')
    }

    if (!localizationConfig.defaultLocale) {
      throw new Error('Invalid localization config: missing defaultLocale')
    }

    return localizationConfig
  } catch (error) {
    console.error('Error loading localization configuration:', error)
    console.warn('Falling back to hardcoded configuration')

    // Fallback configuration
    localizationConfig = {
      defaultLocale: 'en',
      locales: [
        {
          name: 'English',
          code: 'en',
          language: 'en-US',
          file: 'en-us.json',
          dir: 'ltr',
        },
        {
          name: '日本語',
          code: 'ja',
          language: 'ja-JP',
          file: 'ja-jp.json',
          dir: 'ltr',
        },
        {
          name: 'Polski',
          code: 'pl',
          language: 'pl-PL',
          file: 'pl-pl.json',
          dir: 'ltr',
        },
      ],
    }

    return localizationConfig
  }
}

/**
 * Get locale configuration
 */
export function getLocaleConfig(): LocaleConfig[] {
  return loadLocalizationConfig().locales
}

/**
 * Get default locale
 */
export function getDefaultLocale(): string {
  return loadLocalizationConfig().defaultLocale
}

/**
 * Get supported target locales (excluding the default source locale)
 */
export function getSupportedTargetLocales(sourceLocale?: string): string[] {
  const locales = getLocaleConfig()
  const defaultLocale = sourceLocale || getDefaultLocale()
  return locales.filter((locale) => locale.code !== defaultLocale).map((locale) => locale.code)
}

/**
 * Get locale file names for target locales
 */
export function getTargetLocaleFiles(sourceLocale?: string): string[] {
  const locales = getLocaleConfig()
  const defaultLocale = sourceLocale || getDefaultLocale()
  return locales
    .filter((locale) => locale.code !== defaultLocale)
    .map((locale) => locale.file.replace('.json', ''))
}

/**
 * Get human-readable language name for a locale code
 */
export function getLanguageName(localeCode: string): string {
  const locales = getLocaleConfig()
  const locale = locales.find(
    (l) => l.code === localeCode || l.file.replace('.json', '') === localeCode,
  )

  if (locale) {
    return locale.name
  }

  // Fallback mapping for common locale codes
  const fallbackNames: Record<string, string> = {
    'en': 'English',
    'en-us': 'English',
    'ja': 'Japanese',
    'ja-jp': 'Japanese',
    'pl': 'Polish',
    'pl-pl': 'Polish',
  }

  return fallbackNames[localeCode] || localeCode
}

/**
 * Validate if a locale code is supported
 */
export function isSupportedLocale(localeCode: string, mode: TranslationMode): boolean {
  const locales = getLocaleConfig()

  if (mode === TranslationMode.CONTENT) {
    // For content translation, use short codes (en, ja, pl)
    return locales.some((locale) => locale.code === localeCode)
  } else {
    // For JSON translation, use file names (en-us, ja-jp, pl-pl)
    return locales.some((locale) => locale.file.replace('.json', '') === localeCode)
  }
}

/**
 * Get the default source locale
 */
export function getDefaultSourceLocale(mode: TranslationMode): string {
  const defaultLocale = getDefaultLocale()

  if (mode === TranslationMode.CONTENT) {
    return defaultLocale
  } else {
    // For JSON mode, find the file name for the default locale
    const locales = getLocaleConfig()
    const defaultLocaleConfig = locales.find((l) => l.code === defaultLocale)
    return defaultLocaleConfig?.file.replace('.json', '') || 'en-us'
  }
}

/**
 * Setup working directory for script execution
 */
export function setupWorkingDirectory(): void {
  const currentFileUrl = import.meta.url
  const currentDir = dirname(fromFileUrl(currentFileUrl))
  const projectRoot = join(currentDir, '..')
  Deno.chdir(projectRoot)
  console.log(`🔍 Current working directory: ${Deno.cwd()}`)
}

/**
 * Common validation for CLI arguments
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validate target locales for a given translation mode
 */
export function validateTargetLocales(
  targetLocales: string[],
  mode: TranslationMode,
): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [] }

  if (targetLocales.length === 0) {
    result.isValid = false
    result.errors.push('At least one target locale must be specified.')
    return result
  }

  const supportedLocales =
    mode === TranslationMode.CONTENT ? getSupportedTargetLocales() : getTargetLocaleFiles()

  const invalidLocales = []
  for (const locale of targetLocales) {
    const isValid = isSupportedLocale(locale, mode)
    if (!isValid) {
      invalidLocales.push(locale)
    }
  }

  if (invalidLocales.length > 0) {
    result.isValid = false
    result.errors.push(`Unsupported locale(s): ${invalidLocales.join(', ')}`)
    result.errors.push(`Valid locales are: ${supportedLocales.join(', ')}`)
  }

  return result
}

/**
 * Format locale list for display in help text
 */
export function formatLocaleList(mode: TranslationMode): string {
  const locales = getLocaleConfig()
  const defaultLocale = getDefaultLocale()

  if (mode === TranslationMode.CONTENT) {
    const targetCodes = locales.filter((l) => l.code !== defaultLocale).map((l) => l.code)
    return targetCodes.join(', ')
  } else {
    const targetFiles = locales
      .filter((l) => l.code !== defaultLocale)
      .map((l) => l.file.replace('.json', ''))
    return targetFiles.join(', ')
  }
}
