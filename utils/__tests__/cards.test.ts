import { it, describe, expect } from 'vitest'
import { CARDS, shuffle, type CardName, sortByType, matchByMonth } from '../cards'

describe('CARDS', () => {
  it('has 48 values', () => {
    expect(Object.keys(CARDS).length).toBe(48)
  })

  it('has all unique cards', () => {
    const cardNames = new Set([...Object.values(CARDS)].map((card) => card.name))
    expect(cardNames.size).toBe(48)
  })

  it('has 12 suits', () => {
    const suits = new Set([...Object.values(CARDS)].map((card) => card.month))
    expect(suits.size).toBe(12)
  })
})

describe('shuffle', () => {
  const testDeck = [...Object.keys(CARDS)] as CardName[]
  const shuffledDeck = shuffle(testDeck)
  it('returns a new array', () => {
    expect(shuffledDeck === testDeck).toBe(false)
  })
  it('does not mutate the original array', () => {
    expect(shuffledDeck).toHaveLength(testDeck.length)
  })
  it('randomizes original order', () => {
    expect(shuffledDeck).not.toEqual(testDeck)
  })
})

describe('sortByType', () => {
  const testDeck = [...Object.keys(CARDS)] as CardName[]
  const sortedDeck = sortByType(testDeck)
  it('returns the correct number of cards', () => {
    expect(sortedDeck.brights).toHaveLength(5)
    expect(sortedDeck.animals).toHaveLength(9)
    expect(sortedDeck.ribbons).toHaveLength(10)
    expect(sortedDeck.plains).toHaveLength(24)
  })
})

describe('matchByMonth', () => {
  const testField = [
    'matsu-ni-tsuru',
    'matsu-no-tan',
    'sakura-ni-maku',
    'susuki-ni-tsuki',
  ] as CardName[]
  const card = 'matsu-no-kasu-1' as CardName
  const matchedCards = matchByMonth(testField, card)
  it('returns the correct cards', () => {
    expect(matchedCards).toHaveLength(2)
    expect(matchedCards).toContain('matsu-ni-tsuru')
    expect(matchedCards).toContain('matsu-no-tan')
  })
})
