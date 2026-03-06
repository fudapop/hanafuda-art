import baseDesignInfo from '~/assets/designInfo.json'
import type { DesignInfo } from '~/composables/useCardDesign'

type DesignInfoMap = Record<string, DesignInfo>
type PartialDesignInfo = Partial<
  Pick<DesignInfo, 'title' | 'description' | 'urlDescription' | 'creator' | 'contributor'>
>

/**
 * Deep merge utility for design info objects
 */
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base }

  for (const key in override) {
    if (override[key] !== undefined) {
      if (
        typeof override[key] === 'object' &&
        override[key] !== null &&
        !Array.isArray(override[key])
      ) {
        result[key] = deepMerge(
          result[key] || ({} as any),
          override[key] as Partial<T[Extract<keyof T, string>]>,
        )
      } else {
        result[key] = override[key] as T[Extract<keyof T, string>]
      }
    }
  }

  return result
}

/**
 * Load locale-specific design info overrides
 * Returns empty object if locale file doesn't exist
 */
async function loadLocaleDesignInfo(locale: string): Promise<Record<string, PartialDesignInfo>> {
  // Skip English - use base designInfo.json directly
  if (locale === 'en') {
    return {}
  }

  // Map of locale codes to their import functions
  const localeImports: Record<string, () => Promise<any>> = {
    ja: () => import('~/assets/designInfo.ja.json').catch(() => ({})),
    pl: () => import('~/assets/designInfo.pl.json').catch(() => ({})),
    ru: () => import('~/assets/designInfo.ru.json').catch(() => ({})),
    fr: () => import('~/assets/designInfo.fr.json').catch(() => ({})),
  }

  try {
    const importFn = localeImports[locale]
    if (!importFn) {
      return {}
    }

    const localeDesignInfo = await importFn()
    return localeDesignInfo.default || localeDesignInfo || {}
  } catch (error) {
    // File doesn't exist, return empty object
    return {}
  }
}

/**
 * Get merged design info for a specific locale
 * Merges base designInfo.json with locale-specific overrides
 */
export async function getLocalizedDesignInfo(locale: string = 'en'): Promise<DesignInfoMap> {
  const base = baseDesignInfo as DesignInfoMap
  const localeOverrides = await loadLocaleDesignInfo(locale)

  const merged: DesignInfoMap = {}

  for (const designKey in base) {
    const baseInfo: Record<string, any> = base[designKey] || {}
    const localeInfo = localeOverrides[designKey]

    if (localeInfo) {
      // Merge locale-specific overrides with base info
      merged[designKey] = deepMerge(baseInfo, localeInfo) as DesignInfo
    } else {
      // No locale-specific info, use base
      merged[designKey] = baseInfo as DesignInfo
    }
  }

  return merged
}

/**
 * Get merged design info synchronously (for use in composables)
 * Uses a cache to avoid repeated async operations
 */
let designInfoCache: Map<string, DesignInfoMap> = new Map()

export async function getLocalizedDesignInfoSync(locale: string = 'en'): Promise<DesignInfoMap> {
  if (designInfoCache.has(locale)) {
    return designInfoCache.get(locale)!
  }

  const merged = await getLocalizedDesignInfo(locale)
  designInfoCache.set(locale, merged)
  return merged
}

/**
 * Clear the design info cache (useful for hot reloading in development)
 */
export function clearDesignInfoCache() {
  designInfoCache.clear()
}
