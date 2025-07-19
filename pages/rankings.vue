<template>
  <ContentLayout>
    <div class="min-h-screen">
      <!-- Header -->
      <header
        class="px-4 py-8 bg-[url('/images/player_bar.webp')] bg-cover bg-bottom from-primary to-accent sm:px-6 lg:px-8"
      >
        <div class="max-w-4xl mx-auto">
          <div class="text-center text-white">
            <h1 class="mb-2 text-4xl font-bold">🏆 Rankings</h1>
            <p>Top players ranked by performance and activity</p>
          </div>
        </div>
      </header>

      <main>
        <!-- Loading State -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-16"
        >
          <SakuraLoader />
        </div>

        <!-- Error State -->
        <div
          v-else-if="error"
          class="max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8"
        >
          <div
            class="p-6 text-center border border-red-200 rounded-md bg-red-50 dark:bg-red-900/20 dark:border-red-800"
          >
            <p class="text-red-600 dark:text-red-400">
              Failed to load leaderboard data. Please try again later.
            </p>
            <button
              @click="fetchLeaderboard"
              class="px-4 py-2 mt-4 text-white transition-colors bg-red-600 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Leaderboard Content -->
        <div
          v-else
          class="max-w-5xl px-4 py-8 mx-auto sm:px-6 lg:px-8"
        >
          <!-- Filter Options -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="filter in filterOptions"
                :key="filter.value"
                @click="selectedFilter = filter.value"
                :class="[
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  selectedFilter === filter.value
                    ? 'bg-primary text-white'
                    : 'bg-surface dark:bg-surface-variant text-text hover:bg-primary hover:bg-opacity-10',
                ]"
              >
                {{ filter.label }}
              </button>
            </div>
            <div class="text-sm text-text-secondary">{{ filteredLeaderboard.length }} players</div>
          </div>

          <!-- Leaderboard Table -->
          <div
            class="px-8 mx-auto overflow-hidden rounded-md shadow-lg bg-background w-max dark:bg-surface-variant"
          >
            <div class="hidden sm:block">
              <!-- Desktop Table -->
              <table class="w-full">
                <thead class="border-b bg-surface-variant dark:bg-surface border-border">
                  <tr>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-left uppercase text-text"
                    >
                      Rank
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-left uppercase text-text"
                    >
                      Player
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Games
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Wins
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Losses
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Draws
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Win Rate
                    </th>
                    <th
                      class="px-6 py-4 text-sm font-medium tracking-wider text-center uppercase text-text"
                    >
                      Coins
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr
                    v-for="(player, index) in filteredLeaderboard"
                    :key="player.uid"
                    :class="[
                      'hover:bg-surface-variant/50 transition-colors',
                      index < 3 ? 'bg-gradient-to-r from-transparent to-primary/5' : '',
                    ]"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="text-sm font-medium text-text"> #{{ index + 1 }} </span>
                        <span
                          v-if="index === 0"
                          class="ml-2 text-2xl"
                          >🥇</span
                        >
                        <span
                          v-else-if="index === 1"
                          class="ml-2 text-2xl"
                          >🥈</span
                        >
                        <span
                          v-else-if="index === 2"
                          class="ml-2 text-2xl"
                          >🥉</span
                        >
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img
                          :src="player.avatar"
                          :alt="player.username"
                          class="w-10 h-10 mr-3 rounded-full"
                          @error="handleImageError"
                        />
                        <div>
                          <div class="text-sm font-medium text-text">
                            {{ player.username }}
                          </div>
                          <div
                            v-if="player.isGuest"
                            class="text-xs text-text-secondary"
                          >
                            Guest Player
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class="text-sm text-text">{{ player.totalGames }}</span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class="text-sm font-medium text-green-600 dark:text-green-400">
                        {{ player.record.win }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class="text-sm font-medium text-red-600 dark:text-red-400">
                        {{ player.record.loss }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class="text-sm text-text-secondary">{{ player.record.draw }}</span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <div class="flex items-center justify-center">
                        <div
                          :class="[
                            'px-2 py-1 rounded-full text-xs font-medium',
                            player.winRate >= 70
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : player.winRate >= 50
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                          ]"
                        >
                          {{ player.winRate.toFixed(1) }}%
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <div class="flex items-center justify-center">
                        <span class="text-sm text-text">{{
                          player.record.coins.toLocaleString()
                        }}</span>
                        <img
                          src="/images/coin.webp"
                          alt="coin"
                          class="w-4 h-4 ml-1"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div
              v-if="filteredLeaderboard.length > 0"
              class="py-8 space-y-4 sm:hidden"
            >
              <div
                v-for="(player, index) in filteredLeaderboard"
                :key="player.uid"
                :class="[
                  'bg-white dark:bg-surface rounded-lg border border-border p-4',
                  index < 3 ? 'ring-2 ring-primary border-none' : '',
                ]"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center">
                    <span
                      v-if="index === 0"
                      class="mr-2 text-xl"
                      >🥇</span
                    >
                    <span
                      v-else-if="index === 1"
                      class="mr-2 text-xl"
                      >🥈</span
                    >
                    <span
                      v-else-if="index === 2"
                      class="mr-2 text-xl"
                      >🥉</span
                    >
                    <span class="mr-3 text-lg font-bold text-text">#{{ index + 1 }}</span>
                    <img
                      :src="player.avatar"
                      :alt="player.username"
                      class="w-8 h-8 mr-2 rounded-full"
                      @error="handleImageError"
                    />
                    <div>
                      <div class="font-medium text-text">{{ player.username }}</div>
                      <div
                        v-if="player.isGuest"
                        class="text-xs text-text-secondary"
                      >
                        Guest
                      </div>
                    </div>
                  </div>
                  <div
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      player.winRate >= 70
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : player.winRate >= 30
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                    ]"
                  >
                    {{ player.winRate.toFixed(1) }}%
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="text-center">
                    <div class="text-text-secondary">Games</div>
                    <div class="font-medium text-text">{{ player.totalGames }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">Wins</div>
                    <div class="font-medium text-green-600 dark:text-green-400">
                      {{ player.record.win }}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">Losses</div>
                    <div class="font-medium text-red-600 dark:text-red-400">
                      {{ player.record.loss }}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">Coins</div>
                    <div class="flex items-center justify-center font-medium text-text">
                      {{ player.record.coins.toLocaleString() }}
                      <img
                        src="/images/coin.webp"
                        alt="coin"
                        class="w-3 h-3 ml-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredLeaderboard.length === 0"
            class="py-12 text-center"
          >
            <p class="mb-4 text-lg text-text-secondary">No players found</p>
            <p class="text-sm text-text-secondary">
              Be the first to play and appear on the leaderboard!
            </p>
          </div>
        </div>
      </main>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
import { collection, getDocs, getFirestore } from 'firebase/firestore'

definePageMeta({
  title: 'New Hanafuda | Leaderboard',
})

interface LeaderboardPlayer {
  uid: string
  username: string
  avatar: string
  record: {
    win: number
    loss: number
    draw: number
    coins: number
  }
  totalGames: number
  winRate: number
  lastUpdated?: Date
  isGuest?: boolean
}

interface FilterOption {
  label: string
  value: string
}

const LIMIT = 50
const MIN_GAMES = 10

// Reactive state
const loading = ref(true)
const error = ref(false)
const leaderboard = ref<LeaderboardPlayer[]>([])
const selectedFilter = ref('overall')

// Filter options
const filterOptions: FilterOption[] = [
  { label: 'Overall', value: 'overall' },
  { label: 'Most Active', value: 'active' },
  { label: 'Most Wins', value: 'wins' },
  { label: 'Best Win Rate', value: 'winrate' },
]

// Computed properties
const filteredLeaderboard = computed(() => {
  let sorted = [...leaderboard.value]

  switch (selectedFilter.value) {
    case 'active':
      sorted = sorted
        .filter((p) => p.totalGames >= MIN_GAMES)
        .sort((a, b) => b.totalGames - a.totalGames)
      break
    case 'winrate':
      sorted = sorted.filter((p) => p.totalGames >= MIN_GAMES).sort((a, b) => b.winRate - a.winRate)
      break
    case 'wins':
      sorted = sorted.sort((a, b) => b.record.win - a.record.win)
      break
    case 'overall':
    default:
      // Overall ranking: prioritize players with minimum games, then coins, wins, and win rate
      sorted = sorted.sort((a, b) => {
        // First compare if they meet minimum games requirement
        const aHasMinGames = a.totalGames >= MIN_GAMES
        const bHasMinGames = b.totalGames >= MIN_GAMES
        if (aHasMinGames !== bHasMinGames) {
          return bHasMinGames ? 1 : -1
        }

        // Then compare by coins
        if (b.record.coins !== a.record.coins) {
          return b.record.coins - a.record.coins
        }

        // If coins are equal, compare by wins
        if (b.record.win !== a.record.win) {
          return b.record.win - a.record.win
        }

        // If wins are equal, compare by win rate
        return b.winRate - a.winRate
      })
      break
  }

  return sorted.slice(0, LIMIT)
})

// Methods
const fetchLeaderboard = async () => {
  try {
    loading.value = true
    error.value = false

    const db = getFirestore()
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    const players: LeaderboardPlayer[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      const record = data.record || { win: 0, loss: 0, draw: 0, coins: 0 }
      // Adjust for coins spent
      record.coins += Math.max(data.designs.unlocked.length - 3, 0) * 500
      const totalGames = record.win + record.loss + record.draw

      // Only include players who have played at least one game
      if (totalGames > 0) {
        const winRate = totalGames > 0 ? (record.win / totalGames) * 100 : 0

        players.push({
          uid: data.uid || doc.id.replace('u_', ''),
          username: data.username || 'Anonymous Player',
          avatar: data.avatar || '/avatars/flat-crane.webp',
          record,
          totalGames,
          winRate,
          lastUpdated: data.lastUpdated?.toDate?.() || data.lastUpdated,
          isGuest: data.isGuest || false,
        })
      }
    })

    leaderboard.value = players
  } catch (err) {
    console.error('Error fetching leaderboard:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/avatars/flat-crane.webp'
}

// Initialize
onMounted(() => {
  fetchLeaderboard()
})
</script>
