import CARD_DESIGNS from '~/assets/designInfo.json'
import { useConfigStore } from '~/stores/configStore'
import { type CardName, DECK } from '~/utils/cards'
import { useSupabase } from './useSupabase'

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

const supabase = ref<ReturnType<typeof useSupabase> | null>(null)

export const useCardDesign = () => {
  if (!supabase.value) {
    supabase.value = useSupabase()
  }
  const currentDesign: Ref<CardDesign> = useState('design', () => 'cherry-version')

  /**
   *
   * @param designName (optional) Name of design to get info for. Defaults to current design.
   * @returns Info for the current design or the design specified.
   * See link for more: {@link DesignInfo}
   *
   */
  const getDesignInfo = (designName?: CardDesign) =>
    CARD_DESIGNS[designName ?? currentDesign.value] as DesignInfo

  const getCardUrl = (cardName: CardName, design?: CardDesign): string => {
    if (!supabase.value) {
      throw new Error('Supabase not initialized')
    }
    const designName = design ?? currentDesign.value
    const path = `cards/${designName}/${cardName}.${getDesignInfo(designName).formatExt || 'webp'}`
    const {
      data: { publicUrl },
    } = supabase.value.storage.from('static').getPublicUrl(path, {
      transform: {
        width: 120,
        resize: 'contain',
      },
    })
    if (!publicUrl) {
      console.error(`Card URL not found for ${cardName} in ${designName}`)
      return ''
    }
    return publicUrl
  }

  /**
   * Asynchronously fetches the URLs for all cards in the specified design.
   * If the design has been fetched before, the URLs are retrieved from the cache.
   *
   * @param cardDesign Design to get card URLs for.
   * @returns Map of card names to URLs for the specified design.
   */
  const fetchCardUrlMap = async (design: CardDesign) => {
    // Check if the URLs are already in the cache
    let urlMap: CardMap = new Map()

    // Generate URLs for Supabase (service worker will handle caching)
    // urlMap = new Map()
    if (!supabase.value) {
      throw new Error('Supabase not initialized')
    }
    for (const cardName of DECK) {
      const url = getCardUrl(cardName, design)
      urlMap.set(cardName, url)
    }

    return urlMap
  }

  /**
   * Apply card size multiplier from config to CSS custom properties
   */
  const applyCardSizeMultiplier = () => {
    const config = useConfigStore()

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
    fetchCardUrlMap,
    currentDesign,
    getCardUrl,
    getDesignInfo,
    applyCardSizeMultiplier,
    DESIGNS,
  }
}
