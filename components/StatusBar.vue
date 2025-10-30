<template>
  <div class="relative w-full h-16 px-4 py-2">
    <div :class="['w-full h-full mx-auto flex', isPlayer1 ? 'items-end' : 'items-start']">
      <div class="flex space-x-2 sm:space-x-4">
        <div class="flex-shrink-0">
          <img
            v-if="user"
            class="w-12 h-12 mx-auto transition-all border-2 rounded-full lg:w-24 lg:h-24 border-border"
            :src="user.avatar"
            :alt="user.username"
          />
          <img
            v-else
            :src="p2Avatar"
            class="w-12 h-12 mx-auto transition-all border-2 rounded-full lg:w-24 lg:h-24 border-border"
          />
        </div>
        <div :class="['flex flex-col', isPlayer1 ? 'justify-end' : 'justify-start']">
          <p
            v-if="isPlayer1"
            class="text-sm font-normal lg:text-2xl lg:mb-2 text-white/80"
          >
            {{ t('common.labels.round') }} {{ ds.roundCounter }} / {{ config.maxRounds }}
          </p>
          <div
            :class="[
              'flex text-lg gap-x-4  text-white/90',
              isMobileLandscape ? 'flex-col text-sm gap-y-1' : 'lg:text-3xl ',
            ]"
          >
            <p class="flex items-center font-bold gap-x-2">
              {{ user?.username || `${t('common.labels.player')} ${playerNum}` }}
              <span
                class="flex items-center"
                v-memo="[ds.roundOver, gameStart]"
              >
                <img
                  src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/coin.webp"
                  alt="coin"
                  class="w-4 h-4 mx-1 lg:w-8 lg:h-8 drop-shadow-sm"
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScreenOrientation } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import NumberAnimation from 'vue-number-animation'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~/stores/playerStore'

const { isMobile } = useDevice()

const { orientation } = useScreenOrientation()
const isMobileLandscape = computed(() => isMobile && orientation.value?.includes('landscape'))

const { user, playerNum } = defineProps(['user', 'playerNum'])
const ds = useGameDataStore()
const ps = usePlayerStore()
const config = useConfigStore()
const { t } = useI18n()

const gameStart = useState('start')
const { gameOver } = storeToRefs(ds)
const player = `p${playerNum}` as PlayerKey
const opponent: PlayerKey = player === 'p1' ? 'p2' : 'p1'
const score = computed(() => ds.scoreboard[player])
const isPlayer1 = computed(() => playerNum === 1)

const { p1Avatar, p2Avatar } = useAvatar()

const getResult = () => {
  const result =
    ds.scoreboard[player] > ds.scoreboard[opponent]
      ? 'win'
      : ds.scoreboard[player] === ds.scoreboard[opponent]
        ? 'draw'
        : 'loss'
  if (result === 'win') ps.reset(player)
  return result
}

watch(
  () => user,
  () => {
    ps.setPlayerName(player, user?.username || `${t('common.labels.player')} ${playerNum}`)
    if (user?.avatar) {
      p1Avatar.value = user.avatar
    }
  },
  { immediate: true },
)
watch(gameOver, async () => {
  if (!gameOver.value) return
  const result = getResult()
  const { current: currentUser, updateGameRecord } = useProfile()
  if (currentUser.value) {
    // Update game record properly through the exposed method
    await updateGameRecord(result, ds.scoreboard.p1)
  }
  ds.generateGameId()
})
</script>
