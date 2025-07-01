<template>
  <div class="gap-1 opacity-75 collection-area">
    <!-- PLAYER 1 COLLECTION -->
    <ul
      v-for="type in cardTypes"
      :key="type"
      class="relative flex h-full py-2"
      @dblclick="modalOpen = true"
      @dbltap="modalOpen = true"
    >
      <span
        v-show="coll[type].size > 0"
        class="uppercase absolute top-1 left-0 z-[1] whitespace-nowrap bg-gray-800 text-white text-[8px] tracking-wide p-[0.2em_1em] rounded-lg"
      >
        <span class="mr-1 text-xs align-middle">
          {{ coll[type].size }}
        </span>
        {{ type }}
      </span>
      <CardList
        :cards="coll[type]"
        :stack="true"
      />
    </ul>
  </div>

  <LazyModal
    :open="modalOpen"
    ref="modalRef"
    title="Collection"
  >
    <template #title> {{ modalTitle }} </template>
    <template #description>
      <div class="grid gap-1 [--card-height:140px] px-8 py-4">
        <ul
          v-for="type in cardTypes"
          :key="type"
          class="relative flex justify-center h-full py-2"
        >
          <span
            v-show="coll[type].size > 0"
            class="uppercase absolute -top-1 left-0 z-[1] whitespace-nowrap bg-gray-800 text-white text-[8px] tracking-wide p-[0.2em_1em] rounded-lg"
          >
            <span class="mr-1 text-xs align-middle">
              {{ coll[type].size }}
            </span>
            {{ type }}
          </span>
          <CardList
            :cards="coll[type]"
            :stack="true"
          />
        </ul>
      </div>
    </template>
    <template #actions>
      <div class="flex justify-center w-full mt-6">
        <button
          type="button"
          class="sec-btn"
          @click="modalOpen = false"
        >
          Close
        </button>
      </div>
    </template>
  </LazyModal>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCardStore } from '~/stores/cardStore'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { type PlayerKey } from '~/stores/playerStore'
import { type CardName, sortByType } from '~/utils/cards'
import { checkAll, type CompletedYaku, YAKU, type YakuName } from '~/utils/yaku'

export type CompletionEvent = {
  player: PlayerKey
  score: number
  completedYaku: CompletedYaku[]
}

const modalOpen = ref(false)
const modalTitle = computed(() => `${player === 'p1' ? 'My' : "Opponent's"} Collection`)

const { player } = defineProps<{ player: PlayerKey }>()
const emits = defineEmits<{
  (event: 'completed', data: CompletionEvent): void
}>()

const { roundOver, roundCounter: month } = storeToRefs(useGameDataStore())
const cs = useCardStore()
const config = useConfigStore()

const cardTypes = ['brights', 'animals', 'ribbons', 'plains'] as const
const coll: Record<string, Set<CardName>> = reactive({
  brights: new Set([]),
  animals: new Set([]),
  ribbons: new Set([]),
  plains: new Set([]),
})

const collection = computed(() => sortByType([...cs.collection[player]]))
const cBrights = computed(() => collection.value.brights)
const cAnimals = computed(() => collection.value.animals)
const cRibbons = computed(() => collection.value.ribbons)
const cPlains = computed(() => collection.value.plains)

const updateCollection = () => {
  cBrights.value.forEach((card) => coll.brights.add(card))
  cAnimals.value.forEach((card) => coll.animals.add(card))
  cRibbons.value.forEach((card) => coll.ribbons.add(card))
  cPlains.value.forEach((card) => coll.plains.add(card))
}

const resetCollection = () => {
  coll.brights.clear()
  coll.animals.clear()
  coll.ribbons.clear()
  coll.plains.clear()
}

/**
 * Appends '+{n}' to denote the number of extra cards
 * to track if the yaku is upgraded
 */
const applyExtraTags = (yakuList: YakuName[]) => {
  const taggedList = yakuList.map((yaku) => {
    // Allow upgrading yaku to trigger emit.
    if (['kasu', 'tan-zaku', 'tane-zaku'].includes(yaku)) {
      const extra = YAKU[yaku].find(cs.collection[player]).length - YAKU[yaku].numRequired
      return `${yaku}+${extra}`
    } else {
      return yaku
    }
  }) as YakuName[]
  return taggedList
}

let lastCompleted: Set<YakuName> = new Set([])

watchEffect(() => {
  if (config.maxRounds !== 12) {
    updateTsukiFuda(0)
    consoleLogColor('TSUKI-FUDA not available for this game.', 'skyblue')
    return
  }
  updateTsukiFuda(month.value)
  consoleLogColor('TSUKI-FUDA: ' + YAKU['tsuki-fuda'].cards.join(', '), 'skyblue')
})

watch(roundOver, () => {
  if (roundOver.value) {
    lastCompleted.clear()
    resetCollection()
  }
})

watch(
  collection,
  () => {
    if (roundOver.value) return
    updateCollection()

    config.applyWildCardOption()
    const { score, completed: completedYaku } = checkAll(
      cs.collection[player],
      config.allowViewingsYaku === 'none',
    )

    // Filter list based on viewings allowance setting
    const newCompleted = config.applyViewingsOption(completedYaku)

    // Tag potentially upgraded yaku
    const taggedYaku = applyExtraTags(newCompleted)

    // No yaku completed or upgraded since the last update
    if (taggedYaku.every((yaku) => lastCompleted.has(yaku))) return

    if (newCompleted.length) {
      // Emits only if new yaku completed.
      lastCompleted = new Set(taggedYaku)
      emits('completed', {
        player,
        score: config.applyDoubleScoreOption(score),
        completedYaku: getCompleted(cs.collection[player], newCompleted),
      })
    }
  },
  { flush: 'post' },
)
</script>
