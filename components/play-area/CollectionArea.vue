<template>
  <div class="w-full px-4 opacity-90 isolate">
    <div
      :class="[
        'grid grid-rows-1 grid-cols-[repeat(4,max-content)] gap-x-8 [--card-height:60px] w-max mx-auto',
        isMobileLandscape && 'w-36 !gap-x-0 !grid-rows-2 !grid-cols-2 absolute right-12',
      ]"
    >
      <ul
        v-for="type in cardTypes"
        :key="type"
        :class="[
          'relative inline-flex flex-wrap justify-end w-full -gap-2',
          isMobileLandscape && 'max-w-16 h-8',
        ]"
        @dblclick="modalOpen = true"
        @dbltap="modalOpen = true"
      >
        <template v-if="coll[type].size > 0">
          <span
            class="uppercase absolute top-1 left-0 z-[1] whitespace-nowrap bg-gray-800 text-white text-[8px] tracking-wide p-[0.2em_1em] rounded-md"
          >
            <span class="mr-1 text-xs align-middle">
              {{ coll[type].size }}
            </span>
            {{ t(`game.cardTypes.${type}`) }}
          </span>
          <template v-if="!isMobileLandscape">
            <CardList
              :cards="coll[type]"
              :stack="true"
            />
          </template>
        </template>
      </ul>
    </div>
    <!-- <div class="flex justify-end"> -->
    <button
      v-if="hasCards"
      :title="`View ${t('common.labels.collection')}`"
      :class="['my-2 z-30 absolute right-4', player === 'p1' && 'bottom-full']"
      @click="modalOpen = true"
    >
      <span class="sr-only">{{ t('common.labels.collection') }}</span>
      <MagnifyingGlassPlusIcon
        class="w-6 h-6 stroke-2 stroke-text"
        aria-hidden
      />
    </button>
    <!-- </div> -->
  </div>

  <LazyModal
    :open="modalOpen"
    ref="modalRef"
    :title="t('common.labels.collection')"
  >
    <template #title>
      <div class="flex flex-col items-center gap-2">
        <img
          :src="playerAvatar"
          loading="lazy"
          class="w-24 h-24 border rounded-full border-border drop-shadow-sm"
        />
        <span class="text-2xl font-bold">
          {{ t('common.labels.collection') }}
        </span>
      </div>
    </template>
    <template #description>
      <div class="grid gap-1 [--card-height:140px] px-8 py-4 w-screen">
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
            {{ t(`game.cardTypes.${type}`) }}
          </span>
          <CardList
            :cards="coll[type]"
            :stack="true"
          />
        </ul>
      </div>
    </template>
    <template #actions>
      <div class="flex justify-center w-full py-8">
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
import { onClickOutside, useScreenOrientation } from '@vueuse/core'
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

const { t } = useI18n()

const modalRef = ref(null)
const modalOpen = ref(false)

onClickOutside(modalRef, () => {
  modalOpen.value = false
})

const { player } = defineProps<{ player: PlayerKey }>()
const emits = defineEmits<{
  (event: 'completed', data: CompletionEvent): void
}>()

const { p1Avatar, p2Avatar } = useAvatar()
const playerAvatar = computed(() => (player === 'p1' ? p1Avatar.value : p2Avatar.value))

const { isMobile } = useDevice()
const { orientation } = useScreenOrientation()
const isMobileLandscape = computed(() => isMobile && orientation.value?.includes('landscape'))

const ds = useGameDataStore()
const { roundOver, roundCounter: month } = storeToRefs(ds)
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

onMounted(() => {
  updateCollection()

  watchEffect(() => {
    if (config.maxRounds !== 12) {
      updateTsukiFuda(0)
      consoleLogColor('TSUKI-FUDA not available for this game.', 'skyblue')
      return
    }

    // Display cards as arranged by artist
    const { getDesignInfo } = useCardDesign()
    const rearrange = (cards: CardName[]) => {
      const { arrangement } = getDesignInfo()
      if (arrangement?.reversed) {
        return cards.toReversed()
      }
      if (arrangement?.orderByName) {
        // Create a map for O(1) lookups
        const cardSet = new Set(cards)
        // Only iterate arrangement once, filter out non-existent cards
        return arrangement.orderByName.filter((name) => cardSet.has(name as CardName)) as CardName[]
      }
      return cards
    }
    updateTsukiFuda(month.value, rearrange)
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
        newCompleted.forEach((yaku) => {
          ds.logPlayerAction(player, 'complete', YAKU[yaku].cards, yaku)
        })
        emits('completed', {
          player,
          score: config.applyDoubleScoreOption(score),
          completedYaku: getCompleted(cs.collection[player], newCompleted),
        })
      }
    },
    { flush: 'post' },
  )
})
</script>

<style scoped>
.collection-area {
  --card-height: 60px;
  width: max-content;
  display: grid;
  /* grid-template-columns: 45% 55%;
  grid-template-rows: repeat(2, minmax(var(--card-height), 1fr));
}

@media (min-width: 640px) or (max-height: 720px) {
  .collection-area { */
  /* grid-template-columns: 15% 22% 23% 40%; */
  grid-template-columns: repeat(4, max-content);
  grid-template-rows: 1fr;
  gap: 2rem;
  /* } */
}
/* @media (min-width: 1024px) {
  .collection-area {
    justify-content: flex-end;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
} */
</style>
