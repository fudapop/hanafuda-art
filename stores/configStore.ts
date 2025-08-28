/**
 * @fileoverview Config Store
 * 
 * Manages game configuration, user preferences, and rule variations for
 * Hanafuda gameplay. Provides customizable game settings that affect
 * scoring, yaku validation, and UI presentation.
 * 
 * Features:
 * - Game length configuration (3, 6, or 12 rounds)
 * - Yaku viewing restrictions (allow, limited, none)
 * - Scoring rule variations (double over 7, wild sake cup)
 * - UI preferences (card labels, card size)
 * - Settings persistence and validation
 * - Rule application utilities
 * 
 * Rule Variations:
 * - Viewings: Controls whether "viewing" yaku (like tanzaku/tane viewing) count
 * - Double Score: Doubles base score if 7+ points (before koi-koi bonus)
 * - Wild Card: Makes sake cup count as plains for yaku calculations
 * 
 * @example
 * ```typescript
 * const configStore = useConfigStore()
 * 
 * // Load user settings
 * configStore.loadUserSettings({
 *   rounds: 6,
 *   viewings: 'limited',
 *   double: true,
 *   wild: false,
 *   labels: true,
 *   cardSize: 1.2
 * })
 * 
 * // Apply rule variations
 * const finalScore = configStore.applyDoubleScoreOption(8) // Returns 16 if enabled
 * const validYaku = configStore.applyViewingsOption(yakuList)
 * 
 * // Access current settings
 * const settings = configStore.getCurrentSettings
 * ```
 */

import { defineStore } from 'pinia'
import { type YakuName, viewingYaku } from '~/utils/yaku'

/** Available configuration options */
const OPTIONS = {
  /** Available game lengths in rounds */
  GAME_LENGTH: [3, 6, 12] as const,
  /** Viewing yaku restriction levels */
  VIEWINGS: ['allow', 'limited', 'none'] as const,
  /** Available card size multipliers */
  CARD_SIZE: [0.8, 1.0, 1.2] as const,
} as const

/** Valid game length values */
type GameLengthOptions = (typeof OPTIONS.GAME_LENGTH)[number]
/** Valid viewing restriction values */
type ViewingsOptions = (typeof OPTIONS.VIEWINGS)[number]
/** Valid card size multiplier values */
type CardSizeOptions = (typeof OPTIONS.CARD_SIZE)[number]

/** User-facing game settings interface */
export interface GameSettings {
  /** Number of rounds in the game */
  rounds: GameLengthOptions
  /** Viewing yaku restriction level */
  viewings: ViewingsOptions
  /** Whether to double score over 7 points */
  double: boolean
  /** Whether sake cup counts as plains */
  wild: boolean
  /** Whether to show card name labels */
  labels: boolean
  /** Card size multiplier for UI */
  cardSize: CardSizeOptions
}

/** Complete config store state shape */
export interface ConfigStoreState {
  /** Maximum number of rounds in game */
  maxRounds: GameLengthOptions
  /** Viewing yaku restriction setting */
  allowViewingsYaku: ViewingsOptions
  /** Whether to double base scores over 7 */
  doubleScoreOverSeven: boolean
  /** Whether sake cup acts as wild card for plains */
  sakeIsWildCard: boolean
  /** Whether to display card name labels in UI */
  cardLabels: boolean
  /** UI card size multiplier */
  cardSizeMultiplier: CardSizeOptions
  /** Whether user settings have been loaded */
  settingsLoaded: boolean
}

const useConfigStore = defineStore('config', () => {
  const maxRounds = ref(3) as Ref<GameLengthOptions>

  const allowViewingsYaku = ref('allow') as Ref<ViewingsOptions>

  const doubleScoreOverSeven = ref(false)

  const sakeIsWildCard = ref(false)

  const cardLabels = ref(false)

  const cardSizeMultiplier = ref(1.0) as Ref<CardSizeOptions>

  const settingsLoaded = ref(false)

  const getCurrentSettings = computed(
    (): GameSettings => ({
      rounds: maxRounds.value,
      viewings: allowViewingsYaku.value,
      double: doubleScoreOverSeven.value,
      wild: sakeIsWildCard.value,
      labels: cardLabels.value,
      cardSize: cardSizeMultiplier.value,
    }),
  )

  function loadUserSettings(userSettings: GameSettings) {
    maxRounds.value = userSettings.rounds
    allowViewingsYaku.value = userSettings.viewings
    doubleScoreOverSeven.value = userSettings.double
    sakeIsWildCard.value = userSettings.wild
    cardLabels.value = userSettings.labels
    cardSizeMultiplier.value = userSettings.cardSize ?? 1.0
    settingsLoaded.value = true
  }

  /**
   * Filter an array/set of yaku based on set rule
   */
  function applyViewingsOption(yakuList: YakuName[]) {
    const filteredList = yakuList.filter((yaku) => !viewingYaku.has(yaku))

    switch (allowViewingsYaku.value) {
      case 'none':
        return filteredList

      case 'limited':
        if (filteredList.length) {
          return yakuList
        } else {
          return filteredList
        }

      case 'allow':
      default:
        return yakuList
    }
  }

  /**
   * Adds/removes the sake cup to the check for plains
   */
  function applyWildCardOption() {
    const plains = YAKU.kasu.cards
    const isIncluded = plains.includes('kiku-ni-sakazuki')

    if (sakeIsWildCard.value) {
      if (!isIncluded) plains.push('kiku-ni-sakazuki')
    } else {
      if (isIncluded) {
        plains.splice(plains.indexOf('kiku-ni-sakazuki'), 1)
      }
    }
  }

  /**
   * Double score if base score (w/o bonus from koi-koi) is 7 or greater
   */
  function applyDoubleScoreOption(baseScore: number) {
    if (!doubleScoreOverSeven.value) return baseScore
    if (baseScore < 7) return baseScore
    return baseScore * 2
  }

  function exportSerializedState(): string {
    const serializable = {
      maxRounds: maxRounds.value,
      allowViewingsYaku: allowViewingsYaku.value,
      doubleScoreOverSeven: doubleScoreOverSeven.value,
      sakeIsWildCard: sakeIsWildCard.value,
      cardLabels: cardLabels.value,
      cardSizeMultiplier: cardSizeMultiplier.value,
      settingsLoaded: settingsLoaded.value
    }
    return JSON.stringify(serializable)
  }

  function importSerializedState(serializedState: string): boolean {
    try {
      const data = JSON.parse(serializedState)
      
      // Validate structure and types
      if (typeof data.maxRounds !== 'number' || 
          typeof data.allowViewingsYaku !== 'string' ||
          typeof data.doubleScoreOverSeven !== 'boolean') {
        throw new Error('Invalid config store state structure')
      }
      
      maxRounds.value = data.maxRounds
      allowViewingsYaku.value = data.allowViewingsYaku
      doubleScoreOverSeven.value = data.doubleScoreOverSeven
      sakeIsWildCard.value = data.sakeIsWildCard
      cardLabels.value = data.cardLabels
      cardSizeMultiplier.value = data.cardSizeMultiplier
      settingsLoaded.value = data.settingsLoaded
      
      return true
    } catch (error) {
      console.error('Failed to import config store state:', error)
      return false
    }
  }

  return {
    doubleScoreOverSeven,
    allowViewingsYaku,
    maxRounds,
    sakeIsWildCard,
    cardLabels,
    cardSizeMultiplier,
    settingsLoaded,
    getCurrentSettings,
    loadUserSettings,
    applyViewingsOption,
    applyWildCardOption,
    applyDoubleScoreOption,
    exportSerializedState,
    importSerializedState,
    OPTIONS,
  }
})

export { useConfigStore, type CardSizeOptions, type GameLengthOptions, type ViewingsOptions }
