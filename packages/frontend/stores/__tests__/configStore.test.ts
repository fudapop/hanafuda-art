import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigStore, type CardSizeOptions } from '../configStore'

describe('ConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default card size multiplier', () => {
    const store = useConfigStore()
    expect(store.cardSizeMultiplier).toBe(1.0)
  })

  it('updates card size multiplier', () => {
    const store = useConfigStore()
    const newSize: CardSizeOptions = 1.2
    store.cardSizeMultiplier = newSize
    expect(store.cardSizeMultiplier).toBe(1.2)
  })

  it('includes card size in current settings', () => {
    const store = useConfigStore()
    store.cardSizeMultiplier = 0.8
    const settings = store.getCurrentSettings
    expect(settings.cardSize).toBe(0.8)
  })

  it('loads card size from user settings with default fallback', () => {
    const store = useConfigStore()

    // Test loading settings without cardSize (backward compatibility)
    const oldSettings = {
      rounds: 3 as const,
      viewings: 'allow' as const,
      double: false,
      wild: false,
      labels: false,
      fullscreen: false,
    }

    store.loadUserSettings(oldSettings as any)
    expect(store.cardSizeMultiplier).toBe(1.0) // Should fallback to default

    // Test loading settings with cardSize
    const newSettings = {
      ...oldSettings,
      cardSize: 1.2 as CardSizeOptions,
    }

    store.loadUserSettings(newSettings)
    expect(store.cardSizeMultiplier).toBe(1.2)
  })

  it('validates card size options are within expected range', () => {
    const store = useConfigStore()
    const validSizes = store.OPTIONS.CARD_SIZE

    expect(validSizes).toContain(0.8)
    expect(validSizes).toContain(1.0)
    expect(validSizes).toContain(1.2)
    expect(validSizes.length).toBe(3)
  })
})
