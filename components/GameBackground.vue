<template>
  <GameBackgroundImages
    :showPlayerBars="gameIsStarted"
    :animate="koikoiIsCalled"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameDataStore } from '~/stores/gameDataStore'

const { koikoiIsCalled } = useDecisionHandler()

const { roundCounter, roundOver, getCurrent } = storeToRefs(useGameDataStore())

const gameIsStarted = useState('start', () => false)

const { fetchCardUrlMap, currentDesign } = useCardDesign()

const { cacheDesignIfNeeded } = useCardCache()

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
      audio.playSfx(SFX.card1)
    } else if (newPhase === 'collect') {
      audio.playSfx(SFX.card2)
    }
  },
)
const cleanupBgm = watch(
  [koikoiIsCalled, roundCounter, gameIsStarted],
  ([newCall, newRound], [_, oldRound]) => {
    if (newCall) {
      // Play SFX, then crossfade to theme
      audio.playSfx(SFX.slash)
      if (getCurrent.value.player === 'p1') {
        audio.crossfadeTo(BGM.koikoi1, 1.2)
      } else {
        audio.crossfadeTo(BGM.koikoi2, 1.2)
      }
    } else if (newRound > oldRound) {
      audio.crossfadeTo(BGM.main, 2)
    }
  },
)

onMounted(() => {
  cacheDesignIfNeeded(currentDesign.value)
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
