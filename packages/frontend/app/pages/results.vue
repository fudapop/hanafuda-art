<template>
  <ContentLayout>
    <div
      v-if="snapshot"
      class="min-h-screen isolate"
    >
      <div class="max-w-2xl py-8 mx-auto">
        <ResultsOutcomeHeader
          :outcome="snapshot.outcome"
          :score="snapshot.selfScore"
        />

        <ResultsScoreSummary
          :player-name="snapshot.playerName"
          :opponent-name="snapshot.opponentName"
          :self-score="snapshot.selfScore"
          :opponent-score="snapshot.opponentScore"
        />

        <ResultsMatchStats :stats="snapshot.matchStats" />

        <ResultsRoundBreakdown
          :rounds="snapshot.roundHistory"
          :self-key="snapshot.selfKey"
        />

        <!-- Action buttons -->
        <div class="flex justify-center gap-4 px-4 py-8">
          <button
            class="pri-btn"
            @click="handlePlayAgain"
          >
            {{ t('results.playAgain') }}
          </button>
          <button
            class="sec-btn"
            @click="handleBackToMenu"
          >
            {{ t('results.backToMenu') }}
          </button>
        </div>
      </div>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localeRoute = useLocaleRoute()
const { snapshot, clearSnapshot } = useGameResultsSnapshot()
const gameStart = useState('start')

// Guard: redirect to home if no snapshot data
if (!snapshot.value) {
  navigateTo(localeRoute('/'), { replace: true })
}

const playAgain = useState('play-again', () => false)

const returnToMenu = () => {
  clearSnapshot()
  gameStart.value = false
  navigateTo(localeRoute('/'))
}

const handlePlayAgain = () => {
  playAgain.value = true
  returnToMenu()
}
const handleBackToMenu = () => returnToMenu()

onBeforeUnmount(() => {
  clearSnapshot()
})
</script>
