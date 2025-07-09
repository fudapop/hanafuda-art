<template>
  <div class="relative w-full p-4 h-28">
    <div :class="['w-full h-full mx-auto flex', isPlayer1 ? 'items-end' : 'items-start']">
      <div class="flex space-x-2 sm:space-x-4">
        <div class="flex-shrink-0">
          <img
            v-if="user"
            class="w-20 h-20 mx-auto border-2 rounded-full border-border"
            :src="user.avatar"
            :alt="user.username"
          />
          <img
            v-else
            :src="avatar2"
            class="w-20 h-20 mx-auto border-2 rounded-full border-border"
          />
        </div>
        <div :class="['flex flex-col gap-y-2', isPlayer1 ? 'justify-end' : 'justify-start']">
          <p
            v-if="isPlayer1"
            class="text-sm font-normal text-white/80"
          >
            Round {{ ds.roundCounter }} / {{ config.maxRounds }}
          </p>
          <div class="flex text-lg gap-x-4 sm:text-2xl text-white/90">
            <p class="font-bold">
              {{ user?.username || `Player ${playerNum}` }}
            </p>
            <p class="flex items-center font-bold">
              <span
                class="flex items-center"
                v-memo="[ds.roundOver, gameStart]"
              >
                <img
                  src="~/assets/images/coin.webp"
                  alt="coin"
                  class="w-5 h-5 mx-1 drop-shadow-sm"
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
import { storeToRefs } from 'pinia'
import NumberAnimation from 'vue-number-animation'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~/stores/playerStore'

const { user, playerNum } = defineProps(['user', 'playerNum'])
const ds = useGameDataStore()
const ps = usePlayerStore()
const config = useConfigStore()

const gameStart = useState('start')
const { gameOver } = storeToRefs(ds)
const player = `p${playerNum}` as PlayerKey
const opponent: PlayerKey = player === 'p1' ? 'p2' : 'p1'
const score = computed(() => ds.scoreboard[player])
const isPlayer1 = computed(() => playerNum === 1)

const avatars = [
  '/avatars/origami-crane.webp',
  '/avatars/origami-warbler.webp',
  '/avatars/origami-curtain.webp',
  '/avatars/origami-cuckoo.webp',
  '/avatars/origami-bridge.webp',
  '/avatars/origami-butterflies.webp',
  '/avatars/origami-boar.webp',
  '/avatars/origami-deer.webp',
  '/avatars/origami-rainman.webp',
  '/avatars/origami-phoenix.webp',
]
const avatar2 = getRandom(avatars)

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
if (user) {
  watch(gameOver, async () => {
    if (!gameOver.value) return
    const result = getResult()
    const currentUser = toValue(useProfile().current)
    if (currentUser) {
      currentUser.record[result]++
      currentUser.record.coins += ds.scoreboard.p1
    }
    ds.generateGameId()
  })
}
</script>
