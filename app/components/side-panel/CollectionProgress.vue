<template>
  <div class="relative max-w-screen overflow-x-hidden">
    <!-- YAKU LIST VIEW -->
    <div
      v-if="viewMode === 'list'"
      :class="['relative w-full h-full [--card-height:75px]', currentDesign]"
    >
      <div
        class="w-full max-w-lg px-2 py-8 mx-auto space-y-2 overflow-y-auto touch-pan-y rounded-2xl"
      >
        <HeadlessDisclosure
          as="div"
          v-for="yaku in allowedYaku"
          :key="yaku.name"
          v-slot="{ open }"
          v-show="yaku.cards.length > 0"
        >
          <HeadlessDisclosureButton
            :class="[
              'relative grid w-full grid-cols-[repeat(2,1fr)_max-content] px-4 py-2 items-center text-sm font-medium text-left rounded-xs focus:outline-hidden focus-visible:ring-3 focus-visible:ring-opacity-75',
              open && 'bg-border text-text',
              isComplete(yaku)
                ? 'text-green-900! bg-green-400 hover:bg-green-200 focus-visible:ring-green-500'
                : 'text-text bg-accent/20 hover:bg-accent/30 focus-visible:ring-primary border border-border',
            ]"
          >
            <span class="font-bold uppercase max-xs:text-xs whitespace-nowrap">
              {{ yaku.name }}
            </span>

            <CheckCircleIcon
              v-if="isComplete(yaku)"
              class="absolute w-6 h-6 -left-2 opacity-80"
            />
            <span
              v-else
              v-show="!(open || openAll)"
              class="absolute bottom-0 inline-flex mb-1 ml-4"
            >
              <span
                v-for="_ in yaku.cards.filter((card: CardName) => playerHas(card))"
                class="self-center w-3 h-1 ml-1 bg-green-400 rounded-full ring-1 ring-inset ring-green-500"
              ></span>
              <span
                v-for="_ in yaku.numRequired -
                yaku.cards.filter((card: CardName) => playerHas(card)).length"
                class="self-center w-3 h-1 ml-1 rounded-full bg-surface ring-1 ring-inset ring-border"
              ></span>
            </span>

            <span class="mr-4 text-right">
              <span class="font-semibold xs:text-lg">{{ yaku.points }}</span>
              <span
                v-if="yaku.points === 1"
                class="font-semibold align-top"
                >+</span
              >
              {{ t('common.labels.points') }}
            </span>
            <ChevronDownIcon
              :class="[
                'w-5 h-5 text-text-secondary float-right',
                open || openAll ? 'rotate-180' : '',
              ]"
            />
          </HeadlessDisclosureButton>

          <Transition
            appear
            enter-active-class="duration-100 origin-top"
            enter-from-class="-translate-y-4 opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="duration-100 origin-top"
            leave-from-class="opacity-100"
            leave-to-class="-translate-y-4 opacity-0"
          >
            <HeadlessDisclosurePanel
              static
              :key="`${openAll || open}`"
              :class="['px-4 pt-2 pb-6 text-sm text-text', open || openAll ? '' : 'hidden']"
            >
              <p class="mb-2">
                {{ t(`game.yaku.${yaku.name}`) }}
              </p>

              <div class="grid grid-cols-10 gap-1">
                <div
                  v-for="card in yaku.cards"
                  :key="card"
                  :class="[
                    'card overflow-hidden drop-shadow-xs relative',
                    'nth-[n+11]:-mt-4',
                    '[&:nth-child(n+11):nth-child(-n+20)]:ml-4',
                    viewFilter &&
                      (opponentHas(card) || playerHas(card)) &&
                      'after:absolute after:inset-0 after:bg-black/60',
                  ]"
                >
                  <CardImage
                    :card="card"
                    :src="cardMap.get(card)"
                  />
                  <CheckCircleIcon
                    v-if="viewFilter && playerHas(card)"
                    class="absolute z-50 w-5 h-5 text-green-400 top-1 left-1"
                  />
                  <XCircleIcon
                    v-if="viewFilter && opponentHas(card)"
                    class="absolute z-50 w-5 h-5 text-red-400 top-1 left-1"
                  />
                </div>
              </div>

              <div
                v-if="viewingsAllowed === 'limited' && viewingYaku.has(yaku.name)"
                class="flex items-center mt-4 text-xs text-text-secondary"
              >
                <ExclamationCircleIcon
                  class="shrink-0 inline w-4 h-auto mr-1 pointer-events-none"
                />
                <p class="max-w-prose text-balance">
                  {{
                    t('game.yaku.requiresAtLeastOneOther', {
                      notYaku:
                        [...viewingYaku].filter((name) => name != yaku.name)[0]?.toUpperCase() ??
                        'UNKNOWN',
                    })
                  }}
                </p>
              </div>
            </HeadlessDisclosurePanel>
          </Transition>
        </HeadlessDisclosure>
      </div>
    </div>

    <!-- CARDS GRID VIEW -->
    <div
      v-else
      :class="['p-8 isolate h-full w-max mx-auto overflow-y-auto text-text', currentDesign]"
    >
      <template v-if="gridMode === 'default'">
        <div class="grid grid-cols-4 sm:grid-cols-8 gap-0.5">
          <div
            v-for="cardName in cardArray"
            :key="cardName"
            :class="[
              'relative size-max',
              viewFilter &&
                (opponentHas(cardName) || playerHas(cardName)) &&
                'after:absolute after:inset-0 after:bg-black/60',
            ]"
          >
            <div
              :class="[
                'w-20 sm:w-16 h-auto rounded-(--card-radius) overflow-hidden',
                currentDesign,
              ]"
            >
              <CardImage
                :card="cardName"
                :src="cardMap.get(cardName)"
              />
            </div>
            <CheckCircleIcon
              v-if="viewFilter && playerHas(cardName)"
              class="absolute z-50 w-5 h-5 text-green-400 top-1 left-1"
            />
            <XCircleIcon
              v-if="viewFilter && opponentHas(cardName)"
              class="absolute z-50 w-5 h-5 text-red-400 top-1 left-1"
            />
          </div>
        </div>
      </template>
      <template v-if="gridMode === 'month'">
        <div class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="(arr, i) in cardsByMonth"
            :key="`month-arr-${i}`"
            class="flex flex-col items-center gap-2 py-4"
          >
            <span>{{ getMonthName(i) }}</span>
            <div class="grid grid-cols-4 gap-0">
              <div
                v-for="cardName in arr"
                :key="cardName"
                :class="[
                  'relative size-max',
                  viewFilter &&
                    (opponentHas(cardName) || playerHas(cardName)) &&
                    'after:absolute after:inset-0 after:bg-black/60',
                ]"
              >
                <div
                  :class="[
                    'w-20 sm:w-16 h-auto rounded-(--card-radius) overflow-hidden',
                    currentDesign,
                  ]"
                >
                  <CardImage
                    :card="cardName"
                    :src="cardMap.get(cardName)"
                  />
                </div>
                <CheckCircleIcon
                  v-if="viewFilter && playerHas(cardName)"
                  class="absolute z-50 w-5 h-5 text-green-400 top-1 left-1"
                />
                <XCircleIcon
                  v-if="viewFilter && opponentHas(cardName)"
                  class="absolute z-50 w-5 h-5 text-red-400 top-1 left-1"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-if="gridMode === 'type'">
        <div class="grid gap-4">
          <div
            v-for="[cardType, arr] in cardsByType"
            :key="`type-arr-${cardType}`"
            class="flex flex-col items-center gap-2 py-4"
          >
            <span class="capitalize">{{ t(`game.cardTypes.${cardType}`) }}</span>
            <div class="grid grid-cols-5 gap-0.5">
              <div
                v-for="cardName in arr"
                :key="cardName"
                :class="[
                  'relative size-max',
                  viewFilter &&
                    (opponentHas(cardName) || playerHas(cardName)) &&
                    'after:absolute after:inset-0 after:bg-black/60',
                ]"
              >
                <div
                  :class="[
                    'w-16 sm:w-20 h-auto rounded-(--card-radius) overflow-hidden',
                    currentDesign,
                  ]"
                >
                  <CardImage
                    :card="cardName"
                    :src="cardMap.get(cardName)"
                  />
                </div>
                <CheckCircleIcon
                  v-if="viewFilter && playerHas(cardName)"
                  class="absolute z-50 w-5 h-5 text-green-400 top-1 left-1"
                />
                <XCircleIcon
                  v-if="viewFilter && opponentHas(cardName)"
                  class="absolute z-50 w-5 h-5 text-red-400 top-1 left-1"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- VIEW TOGGLE BUTTON$ -->
    <div class="fixed bottom-20 right-3 z-50 space-y-2">
      <button
        class="game-ui-btn opacity-80 hover:opacity-100 text-white/80 bg-black/50 text-2xl"
        @click="toggleView"
      >
        <Icon
          v-if="viewMode === 'grid'"
          name="mdi:view-list"
        />
        <Icon
          v-if="viewMode === 'list'"
          name="mdi:grid-large"
        />
        <span class="sr-only">Toggle View</span>
      </button>
      <button
        class="game-ui-btn opacity-80 hover:opacity-100 text-white/80 bg-black/50 text-2xl"
        @click="toggleFilter"
      >
        <Icon
          v-if="viewFilter"
          name="mdi:filter-off"
        />
        <Icon
          v-else
          name="mdi:filter"
        />
        <span class="sr-only">Toggle Filter</span>
      </button>
      <button
        v-if="viewMode === 'grid'"
        class="game-ui-btn opacity-80 hover:opacity-100 text-white/80 bg-black/50 text-2xl"
        @click="toggleGrid"
      >
        <Icon name="mdi:view-grid-plus" />
        <span class="sr-only">Toggle Display Mode</span>
      </button>
      <button
        v-if="viewMode === 'list'"
        class="game-ui-btn opacity-80 hover:opacity-100 text-white/80 bg-black/50 text-2xl"
        @click="toggleOpenAll"
      >
        <Icon
          v-if="openAll"
          name="mdi:chevron-up"
        />
        <Icon
          v-else
          name="mdi:chevron-down"
        />
        <span class="sr-only">Expand/Collapse</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from '@heroicons/vue/20/solid'
import { useStorage } from '@vueuse/core'
import { type CardName } from '~/utils/cards'
import { type Yaku, teyaku, viewingYaku } from '~/utils/yaku'
import { useCardStore } from '~~/stores/cardStore'
import { useConfigStore } from '~~/stores/configStore'

const { currentDesign, getCardUrlMap, getDesignInfo } = useCardDesign()

const cardMap = computed(() => getCardUrlMap(currentDesign.value))
const cardArray = computed(() => {
  const { arrangement } = getDesignInfo()
  return (arrangement?.orderByName ?? Array.from(cardMap.value.keys())) as CardName[]
})
const cardsByMonth = computed(() => {
  const arr: CardName[][] = []
  Array.from({ length: 12 }).forEach((_, i) => {
    arr.push(cardArray.value.slice(i * 4, i * 4 + 4))
  })
  return arr
})
const cardsByType = computed(() =>
  Object.entries({
    brights: getCardsOfType(cardArray.value, 'bright'),
    animals: getCardsOfType(cardArray.value, 'animal'),
    ribbons: getCardsOfType(cardArray.value, 'ribbon'),
    plains: getCardsOfType(cardArray.value, 'plain'),
  }),
)

const cs = useCardStore()
const config = useConfigStore()
const { t, locale } = useI18n()

const getMonthName = (n: number) => {
  const d = new Date()
  d.setMonth(n)
  return d.toLocaleString(locale.value, {
    month: 'long',
  })
}

interface CollectionViewSettings {
  viewModeIndex: number
  gridModeIndex: number
  viewFilter: boolean
  openAll: boolean
}

const settings = useStorage<CollectionViewSettings>(
  'collection-view-settings',
  {
    viewModeIndex: 0,
    gridModeIndex: 0,
    viewFilter: false,
    openAll: false,
  },
  localStorage,
  { deep: true, mergeDefaults: true },
)

const viewMode = computed(() => ['list', 'grid'][settings.value.viewModeIndex])
const gridMode = computed(() => ['default', 'month', 'type'][settings.value.gridModeIndex])
const viewFilter = computed(() => settings.value.viewFilter)
const openAll = computed(() => settings.value.openAll)

const toggleView = () => {
  settings.value.viewModeIndex = (settings.value.viewModeIndex + 1) % 2
}

const toggleGrid = () => {
  settings.value.gridModeIndex = (settings.value.gridModeIndex + 1) % 3
}
const toggleFilter = () => {
  settings.value.viewFilter = !settings.value.viewFilter
}
const toggleOpenAll = () => {
  settings.value.openAll = !settings.value.openAll
}

const playerHas = toValue(computed(() => (card: CardName) => cs.collection.p1.has(card)))
const opponentHas = toValue(computed(() => (card: CardName) => cs.collection.p2.has(card)))

const isComplete = (yaku: Yaku) => {
  return yaku.cards.filter((card) => playerHas(card)).length >= yaku.numRequired
}

const viewingsAllowed = computed(() => config.allowViewingsYaku)

const allowedYaku = computed(() => {
  const yakuList = [...Object.values(YAKU)].filter((yaku) => !teyaku.has(yaku.name))
  if (viewingsAllowed.value === 'none')
    return yakuList.filter((yaku) => !viewingYaku.has(yaku.name))
  return yakuList
})
</script>
