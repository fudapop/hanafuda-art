<template>
  <GameLayout v-if="isDev">
    <GameBoard
      :data-board-case="scenario"
      data-board-harness
      :field-enabled="false"
      :hand-enabled="false"
    />
  </GameLayout>
</template>

<script setup lang="ts">
/**
 * Static board harness. Seeds Pinia locally so layout tests can render a
 * crowded collection without starting a match or contacting Firebase.
 * Sample state is applied only in development. A production visit redirects
 * and must not leave gameStart or the card store behind for the home page.
 */
import { CARDS, DECK, type CardName, type CardType } from '~/utils/cards'
import { useCardStore } from '~~/stores/cardStore'

const isDev = import.meta.dev

const route = useRoute()
const scenario = computed(() => {
  const value = route.query.case
  return value === 'mid' || value === 'empty' || value === 'stress' ? value : 'stress'
})

const { isMobile } = useDevice()
const { applyCardSizeMultiplier } = useCardDesign()

const take = (pool: CardName[], type: CardType, count: number) => {
  const picked: CardName[] = []
  for (const card of pool) {
    if (picked.length >= count) break
    if (CARDS[card]?.type === type) picked.push(card)
  }
  for (const card of picked) pool.splice(pool.indexOf(card), 1)
  return picked
}

const seedBoard = (caseName: string) => {
  const pool: CardName[] = [...DECK]
  let p1: CardName[] = []
  let p2: CardName[] = []
  let field: CardName[] = []
  let hand1: CardName[] = []
  let hand2: CardName[] = []

  if (caseName === 'stress') {
    p1 = [
      ...take(pool, 'bright', 5),
      ...take(pool, 'animal', 9),
      ...take(pool, 'ribbon', 10),
      ...take(pool, 'plain', 17),
    ]
    field = take(pool, 'plain', 4)
    p2 = [...pool]
    pool.length = 0
  } else if (caseName === 'empty') {
    hand1 = pool.splice(0, 8)
    hand2 = pool.splice(0, 8)
    field = pool.splice(0, 8)
  } else {
    p1 = [
      ...take(pool, 'bright', 2),
      ...take(pool, 'animal', 3),
      ...take(pool, 'ribbon', 2),
      ...take(pool, 'plain', 4),
    ]
    p2 = [
      ...take(pool, 'bright', 2),
      ...take(pool, 'animal', 3),
      ...take(pool, 'ribbon', 3),
      ...take(pool, 'plain', 4),
    ]
    hand1 = pool.splice(0, 8)
    hand2 = pool.splice(0, 8)
    field = pool.splice(0, 8)
  }

  const cs = useCardStore()
  cs.$patch((state) => {
    state.collection.p1 = new Set(p1)
    state.collection.p2 = new Set(p2)
    state.hand.p1 = new Set(hand1)
    state.hand.p2 = new Set(hand2)
    state.field = new Set(field)
    state.deck = new Set(pool)
    state.staged = new Set()
  })
}

if (import.meta.dev) {
  const gameStart = useState('start', () => false)
  gameStart.value = true
  seedBoard(scenario.value)
  onMounted(() => {
    applyCardSizeMultiplier(isMobile ? 0.8 : undefined)
  })
} else {
  await navigateTo('/', { replace: true })
}
</script>
