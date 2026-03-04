<template>
  <div class="relative w-full h-16 px-4 py-2">
    <div class="size-full mx-auto flex items-start">
      <div class="flex space-x-2 sm:space-x-4">
        <div class="shrink-0">
          <img
            :src="opponentAvatar"
            class="size-12 mx-auto transition-all border-2 rounded-full lg:size-24 border-border"
            :alt="opponentName"
          />
        </div>
        <div class="flex flex-col justify-start">
          <div
            :class="[
              'flex text-sm gap-x-4  text-white/90',
              isMobileLandscape ? 'flex-col text-xs gap-y-1' : 'sm:text-lg lg:text-3xl ',
            ]"
          >
            <p class="flex items-center font-bold gap-x-2">
              <span class="">{{ opponentName }}</span>
              <span
                class="flex items-center"
                v-memo="[ds.roundOver, gameStart]"
              >
                <img
                  src="/images/coin.webp"
                  alt="coin"
                  class="size-4 mx-1 lg:size-8 drop-shadow-xs"
                />
                <NumberAnimation
                  ref="number1"
                  :from="0"
                  :to="score"
                  :format="(value: number) => value.toFixed(0)"
                  :duration="1"
                  autoplay
                  easing="linear"
                />
              </span>
            </p>
          </div>
          <!-- Presence indicator (multiplayer only) -->
          <OpponentStatusBadge
            v-if="isMultiplayerGame && opponentPresence?.uid"
            :presence="opponentPresence"
            :show-text="!isMobileLandscape"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScreenOrientation } from '@vueuse/core'
import NumberAnimation from 'vue-number-animation'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'

const { isMobile } = useDevice()

const { orientation } = useScreenOrientation()
const isMobileLandscape = computed(() => isMobile && orientation.value?.includes('landscape'))

const ds = useGameDataStore()
const ps = usePlayerStore()
const { t } = useI18n()

const gameStart = useState('start')

const { opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()
const { opponentPresence } = usePresence()

const score = computed(() => ds.scoreboard[opponentKey.value])

const { p2Avatar } = useAvatar()
const opponent = useMultiplayerMatch().useOpponentPlayer()

const opponentName = computed(() => {
  return (
    opponent.value?.username ||
    ps.players[opponentKey.value].name ||
    `${t('common.labels.player')} 2`
  )
})

const opponentAvatar = computed(() => {
  return opponent.value?.avatar || p2Avatar.value
})

onMounted(() => {
  watch(opponent, (newOpponent) => {
    if (newOpponent?.avatar) {
      p2Avatar.value = newOpponent.avatar
    }
  })
})
</script>
