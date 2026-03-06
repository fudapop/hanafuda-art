/**
 * Composable for locale-aware content queries
 */
export const useLocaleContent = () => {
  const { locale } = useI18n()

  /**
   * Get the collection name for a given base collection and locale
   */
  const getLocaleCollection = (baseCollection: string, targetLocale?: string) => {
    const currentLocale = targetLocale || locale.value || 'en'
    return `${baseCollection}_${currentLocale}` as const
  }

  /**
   * Query a collection with locale fallback
   * First tries the current locale, then falls back to English
   */
  const queryLocaleCollection = async (baseCollection: string, targetLocale?: string) => {
    const currentLocale = targetLocale || locale.value || 'en'
    const collectionName = getLocaleCollection(baseCollection, currentLocale)

    try {
      // Try to query the locale-specific collection
      const result = await queryCollection(collectionName as any)
      return result
    } catch (error) {
      // If the locale-specific collection doesn't exist, fall back to English
      if (currentLocale !== 'en') {
        console.warn(`Collection "${collectionName}" not found, falling back to English`)
        return queryCollection(getLocaleCollection(baseCollection, 'en') as any)
      }
      throw error
    }
  }

  /**
   * Query a specific document from a collection with locale fallback
   */
  const queryLocaleDocument = async (
    baseCollection: string,
    field: string,
    value: string,
    targetLocale?: string,
  ) => {
    const currentLocale = targetLocale || locale.value || 'en'
    const collectionName = getLocaleCollection(baseCollection, currentLocale)

    try {
      // Try to query the locale-specific collection
      const result = await queryCollection(collectionName as any)
        .where(field, '=', value)
        .first()

      // If we found a result, return it
      if (result) {
        return result
      }

      // If no result and we're not already using English, try English fallback
      if (currentLocale !== 'en') {
        console.warn(`Document not found in "${collectionName}", trying English fallback`)
        return queryCollection(getLocaleCollection(baseCollection, 'en') as any)
          .where(field, '=', value)
          .first()
      }

      return null
    } catch (error) {
      // If the locale-specific collection doesn't exist, fall back to English
      if (currentLocale !== 'en') {
        console.warn(`Collection "${collectionName}" not found, falling back to English`)
        return queryCollection(getLocaleCollection(baseCollection, 'en') as any)
          .where(field, '=', value)
          .first()
      }
      throw error
    }
  }

  /**
   * Get all documents from a collection with locale fallback
   */
  const queryAllLocaleDocuments = async (baseCollection: string, targetLocale?: string) => {
    const currentLocale = targetLocale || locale.value || 'en'
    const collectionName = getLocaleCollection(baseCollection, currentLocale)

    try {
      // Try to query the locale-specific collection
      const result = await queryCollection(collectionName as any).all()
      return result
    } catch (error) {
      // If the locale-specific collection doesn't exist, fall back to English
      if (currentLocale !== 'en') {
        console.warn(`Collection "${collectionName}" not found, falling back to English`)
        return queryCollection(getLocaleCollection(baseCollection, 'en') as any).all()
      }
      throw error
    }
  }

  return {
    getLocaleCollection,
    queryLocaleCollection,
    queryLocaleDocument,
    queryAllLocaleDocuments,
  }
}
