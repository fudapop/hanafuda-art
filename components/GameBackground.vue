<template>
  <GameBackgroundImages
    :showPlayerBars="gameIsStarted"
    :animate="koikoiIsCalled"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameDataStore } from '~/stores/gameDataStore'

const { koikoiIsCalled, getCaller } = useDecisionHandler()

const { roundCounter, roundOver, getCurrent } = storeToRefs(useGameDataStore())

const gameIsStarted = useState('start', () => false)

const { fetchCardUrlMap, currentDesign } = useCardDesign()

const preloadHead = useHead({})

const addImagePreloadLinks = (design: CardDesign) => {
  fetchCardUrlMap(design).then((urlMap) => {
    const preloadTags = Array.from(urlMap.values()).map((url) => ({
      rel: 'preload',
      href: url,
      as: 'image' as const,
    }))
    preloadHead?.patch({
      link: preloadTags,
    })
  })
}

const audio = inject('audio') as ReturnType<typeof useAudio>

const { BGM, SFX } = audio

const cleanupCoinSfx = watch(roundOver, (newRoundOver) => {
  if (newRoundOver && getCurrent.value.result.winner === 'p1') {
    audio.playSfx(SFX.coin)
  }
})

const cleanupCardSfx = watch(
  () => getCurrent.value.phase,
  (newPhase) => {
    if (newPhase === 'draw') {
      audio.playSfx(SFX.card3)
    } else if (newPhase === 'collect') {
      audio.playSfx(SFX.card2)
    }
  },
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
        audio.crossfadeTo(BGM.koikoi1, 1.2)
      } else if (caller === 'p1') {
        audio.crossfadeTo(BGM.koikoi2, 1.2)
      }
    } else if (newRound > oldRound) {
      audio.crossfadeTo(BGM.main, 2)
    }
  },
)

onMounted(() => {
  addImagePreloadLinks(currentDesign.value)
})

onUnmounted(() => {
  // Left the game screen
  audio.crossfadeTo?.(BGM.main, 3)
  cleanupBgm()
  cleanupCardSfx()
  cleanupCoinSfx()
})
</script>
