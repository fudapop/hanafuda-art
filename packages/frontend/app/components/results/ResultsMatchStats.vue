<template>
  <div class="px-4 py-4">
    <h2 class="mb-3 text-lg font-semibold tracking-wide text-text">
      {{ t('results.matchStats') }}
    </h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div
        v-for="stat in statCards"
        :key="stat.label"
        class="p-3 rounded-lg bg-surface/60 backdrop-blur-sm border border-border"
      >
        <p class="text-2xl font-bold text-text">{{ stat.value }}</p>
        <p class="text-xs text-text-secondary">{{ stat.label }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MatchStats } from '~/composables/useGameResultsSnapshot'

const { t } = useI18n()

const { stats } = defineProps<{
  stats: MatchStats
}>()

const statCards = computed(() => [
  {
    label: t('results.roundsWon'),
    value: `${stats.roundsWon}W ${stats.roundsLost}L ${stats.roundsDrawn}D`,
  },
  {
    label: t('results.yakuCompleted'),
    value: stats.totalYakuCompleted,
  },
  {
    label: t('results.uniqueYaku'),
    value: stats.uniqueYakuTypes.length,
  },
  {
    label: t('results.koikoiRate'),
    value:
      stats.koikoiCallsMade > 0
        ? `${stats.koikoiCallsSucceeded}/${stats.koikoiCallsMade}`
        : '-',
  },
  {
    label: t('results.bestRound'),
    value: stats.bestRoundScore > 0 ? `${stats.bestRoundScore} pts` : '-',
  },
])
</script>
