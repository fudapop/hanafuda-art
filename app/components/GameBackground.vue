<template>
  <GameBackgroundImages
    :showPlayerBars="gameIsStarted"
    :animate="koikoiIsCalled"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameDataStore } from '~~/stores/gameDataStore'

const { koikoiIsCalled, getCaller } = useDecisionHandler()

const { roundCounter, roundOver, getCurrent, eventHistory } = storeToRefs(useGameDataStore())

const gameIsStarted = useState('start', () => false)

const audio = useNuxtApp().$audio as ReturnType<typeof useAudio>

const { BGM, SFX } = audio

const cleanupCoinSfx = watch(roundOver, (newRoundOver) => {
  if (newRoundOver && getCurrent.value?.result?.winner) {
    audio.playSfx(SFX.coin)
  }
})

const cleanupCardSfx = watch(
  eventHistory,
  () => {
    const lastEntry = eventHistory.value.at(-1)
    if (!lastEntry) return
    if ('action' in lastEntry) {
      if (lastEntry.action === 'discard') {
        audio.playSfx(SFX.card3)
      } else if (lastEntry.action === 'match') {
        audio.playSfx(SFX.card2)
      } else if (lastEntry.action === 'draw') {
        audio.playSfx(SFX.card1)
      }
    }
  },
  { deep: true },
)
const cleanupBgm = watch(
  [koikoiIsCalled, roundCounter, gameIsStarted],
  ([newCall, newRound], [oldCall, oldRound]) => {
    // Only trigger when koikoiIsCalled transitions from false to true
    if (!oldCall && newCall) {
      // Use the player who just called koikoi
      const caller = getCaller.value
      audio.playSfx(SFX.slash)
      if (caller === 'p2') {
        audio.crossfadeTo(BGM.koikoi1, 1.5)
      } else if (caller === 'p1') {
        audio.crossfadeTo(BGM.koikoi2, 1.2)
      }
    } else if (newRound > oldRound) {
      audio.crossfadeTo(BGM.main, 2)
    }
  },
)

const { preloadCardImageCache, currentDesign } = useCardDesign()

onMounted(async () => {
  try {
    await preloadCardImageCache(currentDesign.value)
  } catch (error) {
    console.error('Failed to preload card images:', error)
  }
})

onUnmounted(() => {
  // Left the game screen
  audio.crossfadeTo?.(BGM.main, 3)
  cleanupBgm()
  cleanupCardSfx()
  cleanupCoinSfx()
})
</script>
