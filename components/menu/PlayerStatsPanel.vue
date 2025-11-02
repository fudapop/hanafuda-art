<template>
  <div
    v-if="user?.stats"
    class="mx-2 my-3"
  >
    <!-- Overview Stats Cards -->
    <div class="grid sm:grid-cols-2 gap-3 mb-3">
      <button
        @click="showCardsModal = true"
        class="rounded-lg bg-surface border border-border p-3 hover:bg-background hover:border-primary transition-colors cursor-pointer text-left"
        type="button"
      >
        <div class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
          <Icon name="mdi:cards-variant" />
          {{ t('profile.stats.totalCardsCaptured') }}
        </div>
        <div class="grid items-center grid-cols-2 gap-2">
          <div class="text-2xl font-bold text-text">
            {{ user.stats.totalCardsCaptured }}
          </div>
          <div class="flex-shrink-0 -mr-1">
            <DonutChart
              hide-legend
              :data="cardsChartData"
              :categories="cardsChartCategories"
              :height="50"
              :radius="20"
              :arc-width="6"
              :pad-angle="0.05"
            />
          </div>
        </div>
      </button>
      <button
        @click="showYakuModal = true"
        class="rounded-lg bg-surface border border-border p-3 hover:bg-background hover:border-primary transition-colors cursor-pointer text-left"
        type="button"
      >
        <div class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
          <Icon name="mdi:cards" />
          {{ t('profile.stats.totalYakuCompleted') }}
        </div>
        <div class="grid items-center grid-cols-2 gap-2">
          <div class="text-2xl font-bold text-text">
            {{ user.stats.totalYakuCompleted }}
          </div>
          <div
            v-if="yakuChartData.length > 0"
            class="flex-shrink-0 -mr-1"
          >
            <DonutChart
              hide-legend
              :data="yakuChartData"
              :categories="yakuChartCategories"
              :height="50"
              :radius="20"
              :arc-width="6"
              :pad-angle="0.05"
            />
          </div>
        </div>
      </button>

      <!-- Koi-Koi Calls - Clickable Card -->
      <button
        @click="showKoikoiModal = true"
        class="w-full rounded-lg bg-surface border border-border p-3 hover:bg-background hover:border-primary transition-colors cursor-pointer text-left"
        type="button"
      >
        <div class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
          <Icon name="mingcute:copper-coin-fill" />
          {{ t('profile.stats.koikoiCalls') }}
        </div>
        <div class="grid items-center grid-cols-2 gap-2">
          <div class="text-2xl font-bold text-text">
            {{ totalKoikoiCalls }}
          </div>
          <div
            v-if="totalKoikoiCalls > 0"
            class="flex-shrink-0 -mr-1"
          >
            <DonutChart
              hide-legend
              :data="koikoiChartData"
              :categories="koikoiChartCategories"
              :height="50"
              :radius="20"
              :arc-width="6"
              :pad-angle="0.05"
            />
          </div>
        </div>
      </button>
    </div>

    <!-- Koi-Koi Breakdown Modal -->
    <DonutChartModal
      :open="showKoikoiModal"
      :title="t('profile.stats.koikoiCalls')"
      :data="koikoiChartData"
      :categories="koikoiChartCategories"
      @close="showKoikoiModal = false"
    >
      <template #legend>
        <!-- Legend with Explanations -->
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <CheckCircleIcon class="w-10 h-10 text-green-500 mt-0.5" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <strong class="text-text">{{ t('profile.stats.koikoiSuccess') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.koikoiCalled_success
                }}</span>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed text-balance">
                {{ t('profile.help.koikoiStats.success') }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <XCircleIcon class="w-10 h-10 text-red-500 mt-0.5" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <strong class="text-text">{{ t('profile.stats.koikoiFail') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.stats.koikoiCalled_fail }}</span>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed text-balance">
                {{ t('profile.help.koikoiStats.fail') }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <CircleStackIcon class="w-10 h-10 text-accent mt-0.5" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <strong class="text-text">{{ t('profile.stats.koikoiStack') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.stats.koikoiCalled_stack }}</span>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed text-balance">
                {{ t('profile.help.koikoiStats.stack') }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <ArrowPathIcon class="w-10 h-10 text-orange-500 mt-0.5" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <strong class="text-text">{{ t('profile.stats.koikoiReversal') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.koikoiCalled_reversal
                }}</span>
              </div>
              <p class="text-sm text-text-secondary leading-relaxed text-balance">
                {{ t('profile.help.koikoiStats.reversal') }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </DonutChartModal>

    <!-- Cards Captured Breakdown Modal -->
    <DonutChartModal
      :open="showCardsModal"
      :title="t('profile.stats.cardsCapturedByType')"
      :data="cardsChartData"
      :categories="cardsChartCategories"
      @close="showCardsModal = false"
    >
      <template #legend>
        <!-- Legend with Card Types -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex items-start gap-3">
            <Icon
              name="material-symbols:sunny"
              class="w-8 h-8 text-yellow-500 flex-shrink-0"
            />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <strong class="text-text capitalize">{{ t('game.cardTypes.brights') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.cardsCaptured_bright
                }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Icon
              name="lucide:panda"
              class="w-8 h-8 text-orange-500 flex-shrink-0"
            />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <strong class="text-text capitalize">{{ t('game.cardTypes.animals') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.cardsCaptured_animal
                }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Icon
              name="game-icons:scroll-unfurled"
              class="w-8 h-8 text-red-500 flex-shrink-0"
            />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <strong class="text-text capitalize">{{ t('game.cardTypes.ribbons') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.cardsCaptured_ribbon
                }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Icon
              name="ph:plant-fill"
              class="w-8 h-8 text-green-600 flex-shrink-0"
            />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <strong class="text-text capitalize">{{ t('game.cardTypes.plains') }}</strong>
                <span class="text-lg font-bold text-text">{{
                  user.stats.cardsCaptured_plain
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DonutChartModal>

    <!-- Yaku Completed Breakdown Modal -->
    <DonutChartModal
      :open="showYakuModal"
      :title="t('profile.stats.yakuBreakdown')"
      :data="yakuChartData"
      :categories="yakuChartCategories"
      @close="showYakuModal = false"
    >
      <template #legend>
        <!-- Legend with Yaku Types -->
        <div class="space-y-3">
          <div
            v-for="yaku in yakuList"
            :key="yaku.key"
            class="flex items-center justify-between"
          >
            <div class="grid">
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{
                    backgroundColor: yakuChartCategories[t(`game.yaku.${yaku.key}`)].color,
                  }"
                />
                <strong class="text-text text-sm">{{ t(`game.yaku.${yaku.key}`) }}</strong>
              </div>
            </div>
            <span class="text-lg font-bold text-text">{{ yaku.value }}</span>
          </div>
        </div>
      </template>
    </DonutChartModal>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CircleStackIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()

const user = useProfile().current
const showKoikoiModal = ref(false)
const showCardsModal = ref(false)
const showYakuModal = ref(false)

// Koi-Koi Stats
const totalKoikoiCalls = computed(() => {
  if (!user.value?.stats) return 0
  return (
    user.value.stats.koikoiCalled_success +
    user.value.stats.koikoiCalled_fail +
    user.value.stats.koikoiCalled_stack +
    user.value.stats.koikoiCalled_reversal
  )
})

const koikoiChartData = computed(() => [
  user.value?.stats.koikoiCalled_success || 0,
  user.value?.stats.koikoiCalled_fail || 0,
  user.value?.stats.koikoiCalled_stack || 0,
  user.value?.stats.koikoiCalled_reversal || 0,
])

const koikoiChartLabels = computed(() => [
  { name: t('profile.stats.koikoiSuccess'), color: '#22c55e' },
  { name: t('profile.stats.koikoiFail'), color: '#ef4444' },
  { name: t('profile.stats.koikoiStack'), color: '#ffe6a0' },
  { name: t('profile.stats.koikoiReversal'), color: '#171311' },
])

const koikoiChartCategories = computed(() =>
  Object.fromEntries(
    koikoiChartLabels.value.map((i) => [i.name, { name: i.name, color: i.color }]),
  ),
)

// Cards Captured Stats
const cardsChartData = computed(() => [
  user.value?.stats.cardsCaptured_bright || 0,
  user.value?.stats.cardsCaptured_animal || 0,
  user.value?.stats.cardsCaptured_ribbon || 0,
  user.value?.stats.cardsCaptured_plain || 0,
])

const cardsChartLabels = computed(() => [
  { name: t('game.cardTypes.brights'), color: '#eab308' }, // yellow-500
  { name: t('game.cardTypes.animals'), color: '#f97316' }, // orange-500
  { name: t('game.cardTypes.ribbons'), color: '#ef4444' }, // red-500
  { name: t('game.cardTypes.plains'), color: '#16a34a' }, // green-600
])

const cardsChartCategories = computed(() =>
  Object.fromEntries(cardsChartLabels.value.map((i) => [i.name, { name: i.name, color: i.color }])),
)

const yakuList = computed(() =>
  Array.from(YAKU_NAMES)
    .map((key) => ({
      key,
      value: +(user.value?.stats[`yakuCompleted_${key}` as keyof typeof user.value.stats] || 0),
    }))
    .filter((yaku) => yaku.value > 0),
)

const yakuChartData = computed(() => yakuList.value.map((yaku) => yaku.value))

const yakuChartLabels = computed(() =>
  yakuList.value.map((yaku, idx) => ({
    name: t(`game.yaku.${yaku.key}`),
    color: [
      '#ef4444', // red-500
      '#f97316', // orange-500
      '#f59e0b', // amber-500
      '#eab308', // yellow-500
      '#84cc16', // lime-500
      '#22c55e', // green-500
      '#10b981', // emerald-500
      '#14b8a6', // teal-500
      '#06b6d4', // cyan-500
      '#0ea5e9', // sky-500
      '#3b82f6', // blue-500
      '#6366f1', // indigo-500
      '#8b5cf6', // violet-500
      '#a855f7', // purple-500
    ][idx % 14],
  })),
)

const yakuChartCategories = computed(() =>
  Object.fromEntries(yakuChartLabels.value.map((i) => [i.name, { name: i.name, color: i.color }])),
)
</script>

<style>
:root {
  --vis-donut-background-color: transparent;
}

/* Hide tooltip from charts */
[data-vis-xy-container] svg,
[data-vis-single-container] svg {
  pointer-events: none;
}
</style>
