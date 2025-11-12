import CARD_DESIGNS from '~/assets/designInfo.json'
import { type CardName, DECK } from '~/utils/cards'
import { getLocalizedDesignInfoSync } from '~/utils/designInfo'
import { type CardSizeOptions, useConfigStore } from '~~/stores/configStore'

export type DesignInfo = {
  name: string
  title: string
  creator?: string
  releaseDate?: string | Date
  description?: string
  urlDescription?: string
  url?: string
  contributor?: string
  contributorUrl?: string
  backImage?: boolean
  arrangement?: {
    reversed?: boolean
    orderByName?: string[]
  }
  formatExt?: string
}

export type CardDesign = keyof typeof CARD_DESIGNS

const DESIGNS = (Object.keys(CARD_DESIGNS) as CardDesign[]).filter(
  // Temporary filter; need better images
  (design) => CARD_DESIGNS[design].name !== 'ramen-red',
)

type CardMap = Map<CardName, string>

export const useCardDesign = () => {
  const { supabaseUrl } = useRuntimeConfig().public
  const { locale } = useI18n()
  const bucketUrl = `${supabaseUrl}/storage/v1/render/image/public/static`
  const currentDesign: Ref<CardDesign> = useState('design', () => 'cherry-version')

  // Cache for localized design info
  const localizedDesigns = useState<Record<string, Record<string, DesignInfo>>>(
    'localizedDesigns',
    () => ({}),
  )

  // Reactive localized design info that updates when locale changes
  const localizedDesignsMap = ref<Record<string, DesignInfo>>({})

  // Load and cache localized design info for current locale
  const loadLocalizedDesigns = async () => {
    const currentLocale = locale.value || 'en'

    if (!localizedDesigns.value[currentLocale]) {
      localizedDesigns.value[currentLocale] = await getLocalizedDesignInfoSync(currentLocale)
    }

    localizedDesignsMap.value = localizedDesigns.value[currentLocale]
  }

  // Watch locale changes and reload design info
  watch(
    locale,
    () => {
      loadLocalizedDesigns()
    },
    { immediate: true },
  )

  /**
   *
   * @param designName (optional) Name of design to get info for. Defaults to current design.
   * @returns Info for the current design or the design specified.
   * See link for more: {@link DesignInfo}
   *
   * @throws {Error} If the design info is not found.
   *
   */
  const getDesignInfo = (designName?: CardDesign): DesignInfo => {
    const design = designName ?? currentDesign.value
    // Use localized info if available, otherwise fall back to base
    const info = localizedDesignsMap.value[design] || CARD_DESIGNS[design]

    if (!info) {
      throw new Error(`Design info not found for design: ${design}`)
    }
    return info
  }

  const getCardUrl = (cardName: CardName, design?: CardDesign): string => {
    const designName = design ?? currentDesign.value
    const designInfo = getDesignInfo(designName)
    const path = `${bucketUrl}/cards/${designName}/${cardName}.${designInfo.formatExt || 'webp'}`
    const query = new URLSearchParams({
      width: '120',
      resize: 'contain',
    })
    return `${path}?${query.toString()}`
  }

  /**
   * Generates the URLs for all cards in the specified design.
   *
   * @param cardDesign Design to get card URLs for.
   * @returns Map of card names to URLs for the specified design.
   */
  const getCardUrlMap = (design: CardDesign) => {
    let urlMap: CardMap = new Map()

    for (const cardName of DECK) {
      const url = getCardUrl(cardName, design)
      urlMap.set(cardName, url)
    }

    return urlMap
  }

  /**
   * Asynchronously fetch images to preload the cache
   *
   * @param cardDesign Design to fetch images for.
   *
   */
  const preloadCardImageCache = async (design: CardDesign) => {
    const urls = Array.from(getCardUrlMap(design).values())
    await Promise.allSettled(urls.map((url) => fetch(url, { mode: 'no-cors' })))
  }

  /**
   * Apply card size multiplier from config to CSS custom properties
   * @param multiplier - Card size option override
   *
   */
  const applyCardSizeMultiplier = (multiplier?: CardSizeOptions) => {
    const validOptions: CardSizeOptions[] = [0.8, 1, 1.2]
    const config = useConfigStore()

    // Use provided multiplier if valid, else use config value if valid, else default to 1
    const validMultiplier: CardSizeOptions =
      validOptions.find((option) => option === multiplier) ||
      validOptions.find((option) => option === config.cardSizeMultiplier) ||
      1

    config.cardSizeMultiplier = validMultiplier

    watch(
      () => config.cardSizeMultiplier,
      (multiplier) => {
        if (document) {
          const baseHeight = 140 // Base card height in pixels
          const newHeight = baseHeight * multiplier
          document.body.style.setProperty('--card-height', `${newHeight}px`)
        }
      },
      { immediate: true },
    )
  }

  return {
    preloadCardImageCache,
    getCardUrlMap,
    currentDesign,
    getCardUrl,
    getDesignInfo,
    applyCardSizeMultiplier,
    DESIGNS,
  }
}
