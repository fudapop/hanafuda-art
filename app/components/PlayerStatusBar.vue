<template>
  <div class="relative w-full h-16 px-4 py-2">
    <div class="size-full mx-auto flex items-end">
      <div class="flex space-x-2 sm:space-x-4">
        <div class="shrink-0">
          <img
            v-if="user"
            class="size-12 mx-auto transition-all border-2 rounded-full lg:size-24 border-border"
            :src="user.avatar"
            :alt="user.username"
          />
          <img
            v-else
            :src="p1Avatar"
            class="size-12 mx-auto transition-all border-2 rounded-full lg:size-24 border-border"
            alt=""
          />
        </div>
        <div class="flex flex-col justify-end">
          <p class="text-sm font-normal lg:text-2xl lg:mb-2 text-white/80">
            {{ t('common.labels.round') }} {{ ds.roundCounter }} / {{ config.maxRounds }}
          </p>
          <div
            :class="[
              'flex text-sm gap-x-4  text-white/90',
              isMobileLandscape ? 'flex-col text-xs gap-y-1' : 'sm:text-lg lg:text-3xl ',
            ]"
          >
            <p class="flex items-center font-bold gap-x-2">
              <span class="">{{ user?.username || `${t('common.labels.player')} 1` }}</span>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScreenOrientation } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import NumberAnimation from 'vue-number-animation'
import { useConfigStore } from '~~/stores/configStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'

const { isMobile } = useDevice()

const { orientation } = useScreenOrientation()
const isMobileLandscape = computed(() => isMobile && orientation.value?.includes('landscape'))

const { user } = defineProps<{ user?: { username: string; avatar: string } | null }>()
const ds = useGameDataStore()
const ps = usePlayerStore()
const config = useConfigStore()
const { t } = useI18n()

const gameStart = useState('start')
const { gameOver } = storeToRefs(ds)

const { selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()

const score = computed(() => ds.scoreboard[selfKey.value])

const { p1Avatar, p2Avatar } = useAvatar()
const opponent = useMultiplayerMatch().useOpponentPlayer()

const getResult = () => {
  const result =
    ds.scoreboard[selfKey.value] > ds.scoreboard[opponentKey.value]
      ? 'win'
      : ds.scoreboard[selfKey.value] === ds.scoreboard[opponentKey.value]
        ? 'draw'
        : 'loss'
  if (result === 'win') ps.reset(selfKey.value)
  return result
}

onMounted(() => {
  watch(
    () => user,
    () => {
      ps.setPlayerName(selfKey.value, user?.username || `${t('common.labels.player')} 1`)
      if (user?.avatar) {
        p1Avatar.value = user.avatar
      }
      if (isMultiplayerGame.value && opponent.value) {
        p2Avatar.value = opponent.value.avatar
      }
    },
    { immediate: true },
  )
  watch(opponent, (newOpponent) => {
    if (newOpponent?.avatar) {
      p2Avatar.value = newOpponent.avatar
    }
  })
  watch(gameOver, async () => {
    if (!gameOver.value) return
    // Only update game record from the actual user's StatusBar
    if (!user) return

    const result = getResult()
    const { updateGameRecord } = useProfile()
    // Update game record properly through the exposed method
    await updateGameRecord(result, ds.scoreboard[selfKey.value])
    ds.generateGameId()
  })
})
</script>
