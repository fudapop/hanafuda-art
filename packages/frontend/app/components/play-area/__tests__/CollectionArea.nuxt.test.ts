import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import CollectionArea from '../CollectionArea.vue'
import { DECK, sortByType, type CardName } from '~/utils/cards'
import { checkForWin, YAKU } from '~/utils/yaku'
import { useCardStore } from '~~/stores/cardStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore, type PlayerKey } from '~~/stores/playerStore'

const PILE_TYPES = ['brights', 'animals', 'ribbons', 'plains'] as const

const CRANE = 'matsu-ni-tsuru'

/**
 * Opening deal: p1 has no lucky hand, p2 has four pine cards (teshi), including
 * the crane. The field is the next eight cards of the remaining deck and is not
 * four of a kind or four pairs.
 */
const ROUND_1_P1: CardName[] = [
  'ume-ni-uguisu',
  'ume-no-tan',
  'sakura-ni-maku',
  'sakura-no-tan',
  'ayame-ni-yatsuhashi',
  'hagi-ni-inoshishi',
  'botan-ni-chou',
  'fuji-ni-kakku',
]

const ROUND_1_P2: CardName[] = [
  'matsu-ni-tsuru',
  'matsu-no-tan',
  'matsu-no-kasu-1',
  'matsu-no-kasu-2',
  'ume-no-kasu-1',
  'ume-no-kasu-2',
  'sakura-no-kasu-1',
  'ayame-no-kasu-1',
]

/** Round 2: p1's hand starts with two brights, in the order they will be captured. */
const ROUND_2_BRIGHTS = ['sakura-ni-maku', 'susuki-ni-tsuki'] as const satisfies readonly CardName[]

const ROUND_2_P1: CardName[] = [
  ...ROUND_2_BRIGHTS,
  'ume-ni-uguisu',
  'ume-no-tan',
  'ayame-ni-yatsuhashi',
  'hagi-ni-inoshishi',
  'botan-ni-chou',
  'fuji-ni-kakku',
]

const ROUND_2_P2: CardName[] = [
  'ume-no-kasu-1',
  'sakura-no-kasu-1',
  'ayame-no-kasu-1',
  'hagi-no-tan',
  'botan-no-tan',
  'fuji-no-tan',
  'kiku-ni-sakazuki',
  'momiji-ni-shika',
]

const ROUND_2_FIELD: CardName[] = [
  'hagi-no-kasu-1',
  'botan-no-kasu-1',
  'fuji-no-kasu-1',
  'susuki-no-kasu-1',
  'kiku-no-kasu-1',
  'momiji-no-kasu-1',
  'yanagi-ni-tsubame',
  'kiri-no-kasu-1',
]

function deckFromOpening(...groups: CardName[][]): CardName[] {
  const opening = groups.flat()
  const used = new Set(opening)
  if (used.size !== opening.length) throw new Error('Opening deal repeats a card')
  const rest = DECK.filter((card) => !used.has(card))
  const deck = [...opening, ...rest]
  if (deck.length !== DECK.length) throw new Error('Opening deal does not cover the deck')
  return deck
}

function displayedPiles(wrapper: VueWrapper) {
  return Object.fromEntries(
    PILE_TYPES.map((type) => [
      type,
      wrapper
        .get(`[data-collection-pile="${type}"]`)
        .findAll('img')
        .map((img) => img.attributes('alt')),
    ]),
  ) as Record<(typeof PILE_TYPES)[number], string[]>
}

function expectPilesMatchStore(wrapper: VueWrapper, player: PlayerKey) {
  const expected = sortByType([...useCardStore().collection[player]])
  const shown = displayedPiles(wrapper)
  for (const type of PILE_TYPES) {
    expect(shown[type], `${player} ${type}`).toEqual(expected[type])
  }
}

describe('CollectionArea piles follow the card store', () => {
  const yakuCards = {
    teshi: YAKU.teshi.cards,
    kuttsuki: YAKU.kuttsuki.cards,
    tsukiFuda: YAKU['tsuki-fuda'].cards,
  }
  const mounted: VueWrapper[] = []

  beforeEach(() => {
    const pinia = useNuxtApp().vueApp.config.globalProperties.$pinia
    if (pinia) setActivePinia(pinia)
    useGameDataStore().reset()
    useCardStore().reset()
    usePlayerStore().reset('p1')
  })

  afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount()
    mounted.length = 0
    YAKU.teshi.cards = yakuCards.teshi
    YAKU.kuttsuki.cards = yakuCards.kuttsuki
    YAKU['tsuki-fuda'].cards = yakuCards.tsukiFuda
  })

  it('drops a round-1 lucky hand from both piles when round 2 starts', async () => {
    const cs = useCardStore()
    const ds = useGameDataStore()

    cs.deck = new Set(deckFromOpening(ROUND_1_P1, ROUND_1_P2))
    ds.startRound()

    expect(checkForWin(cs.field)).toBeNull()
    expect(checkForWin(cs.hand.p1)).toBeNull()
    const luckyHand = checkForWin(cs.hand.p2)
    expect(luckyHand?.name).toBe('teshi')
    expect(luckyHand?.cards).toContain(CRANE)

    // Same sequence as checkDeal + handleInstantWin, which runs before PlayArea
    // mounts (PlayArea is v-if="gameStart"). roundOver is already true on mount.
    cs.stageForCollection([...(luckyHand?.cards ?? [])])
    cs.collectCards('p2')
    ds.saveResult({
      winner: 'p2',
      score: luckyHand?.points ?? 0,
      completedYaku: luckyHand ? [luckyHand] : [],
    })
    ds.endRound()
    expect(ds.roundOver).toBe(true)
    expect(cs.collection.p2.has(CRANE)).toBe(true)
    expect(cs.collection.p1.has(CRANE)).toBe(false)

    const player = await mountSuspended(CollectionArea, { props: { player: 'p1' } })
    const opponent = await mountSuspended(CollectionArea, { props: { player: 'p2' } })
    mounted.push(player, opponent)
    await nextTick()

    expectPilesMatchStore(player, 'p1')
    expectPilesMatchStore(opponent, 'p2')
    expect(displayedPiles(opponent).brights).toContain(CRANE)
    expect(displayedPiles(player).brights).not.toContain(CRANE)

    ds.nextRound()
    await nextTick()

    expect(ds.roundOver).toBe(false)
    expect(cs.collection.p1.size).toBe(0)
    expect(cs.collection.p2.size).toBe(0)
    expectPilesMatchStore(player, 'p1')
    expectPilesMatchStore(opponent, 'p2')
    expect(displayedPiles(player).brights).not.toContain(CRANE)
    expect(displayedPiles(opponent).brights).not.toContain(CRANE)

    cs.deck = new Set(deckFromOpening(ROUND_2_P1, ROUND_2_P2, ROUND_2_FIELD))
    ds.startRound()
    await nextTick()
    expect(ds.roundCounter).toBe(2)
    expectPilesMatchStore(player, 'p1')
    expectPilesMatchStore(opponent, 'p2')

    const [firstBright, secondBright] = ROUND_2_BRIGHTS
    cs.stageForCollection([firstBright])
    cs.collectCards('p1')
    await nextTick()
    expect(displayedPiles(player).brights).toEqual([firstBright])
    const firstBrightImage = player.get(`img[alt="${firstBright}"]`).element

    cs.stageForCollection([secondBright])
    cs.collectCards('p1')
    await nextTick()

    expect(displayedPiles(player).brights).toEqual([firstBright, secondBright])
    expect(player.get(`img[alt="${firstBright}"]`).element).toBe(firstBrightImage)
    expect(displayedPiles(opponent).brights).not.toContain(CRANE)

    const capturedPlain = ROUND_2_P2[0]!
    cs.stageForCollection([capturedPlain])
    cs.collectCards('p2')
    await nextTick()

    expectPilesMatchStore(player, 'p1')
    expectPilesMatchStore(opponent, 'p2')
    expect(displayedPiles(opponent).plains).toEqual([capturedPlain])
    expect(displayedPiles(player).brights).not.toContain(CRANE)
    expect(displayedPiles(opponent).brights).not.toContain(CRANE)
    expect(cs.collection.p1.has(CRANE)).toBe(false)
    expect(cs.collection.p2.has(CRANE)).toBe(false)
  })
})
