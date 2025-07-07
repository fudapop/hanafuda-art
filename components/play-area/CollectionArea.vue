<template>
  <div class="w-full px-4 opacity-90">
    <button
      v-if="hasCards"
      :title="`View ${modalTitle}`"
      :class="['absolute right-4 my-2', player === 'p1' ? 'bottom-full' : 'top-full']"
      @click="modalOpen = true"
    >
      <span class="sr-only">View {{ modalTitle }}</span>
      <MagnifyingGlassPlusIcon
        class="w-6 h-6 stroke-2 stroke-text"
        aria-hidden
      />
    </button>
    <div class="collection-area">
      <ul
        v-for="type in cardTypes"
        :key="type"
        class="relative inline-flex flex-wrap justify-end w-full max-w-[200px] -gap-2"
        @dblclick="modalOpen = true"
        @dbltap="modalOpen = true"
      >
        <span
          v-show="coll[type].size > 0"
          class="uppercase absolute top-1 right-0 z-[1] whitespace-nowrap bg-gray-800 text-white text-[8px] tracking-wide p-[0.2em_1em] rounded-md"
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
          class="relative flex flex-wrap h-full max-w-full py-2"
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
import { MagnifyingGlassPlusIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
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

const modalRef = ref(null)
const modalOpen = ref(false)
const modalTitle = computed(() => `${player === 'p1' ? 'My' : "Opponent's"} Collection`)

onClickOutside(modalRef, () => {
  modalOpen.value = false
})

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
const hasCards = computed(() => Object.values(coll).some((c) => c.size))

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

<style scoped>
.collection-area {
  --card-height: 50px;
  display: grid;
  grid-template-columns: 45% 55%;
  grid-template-rows: repeat(2, minmax(var(--card-height), 1fr));
}

@media (min-width: 640px) or (max-height: 720px) {
  .collection-area {
    /* grid-template-columns: 15% 22% 23% 40%; */
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: minmax(var(--card-height), 1fr);
  }
}
/* 
@media (min-width: 640px) and (min-height: 720px) {
  .collection-area {
    --card-height: 75px;
  }
} */

@media (min-width: 1024px) {
  .collection-area {
    justify-content: flex-end;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    /* grid-template-rows: repeat(4, minmax(var(--card-height), 1fr)); */
  }
}
</style>
