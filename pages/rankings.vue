<template>
  <ContentLayout>
    <div class="min-h-screen">
      <!-- Header -->
      <header
        :class="[
          'sticky top-0',
          'px-4 py-6 min-h-20 lg:py-8 bg-[url(/images/player_bar.webp)] bg-cover bg-bottom lg:px-8',
        ]"
      >
        <h1 class="text-lg font-bold text-center text-white lg:text-3xl">
          🏆 {{ t('rankings.title') }} -
          <span class="capitalize">{{ t(`rankings.filters.${selectedFilter}`) }}</span>
        </h1>
      </header>

      <main class="mx-auto overflow-x-auto max-w-screen lg:px-8 touch-pan-x">
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
              {{ t('rankings.failedToLoad') }}
            </p>
            <button
              @click="fetchLeaderboard"
              class="px-4 py-2 mt-4 text-white transition-colors bg-red-600 rounded hover:bg-red-700"
            >
              {{ t('rankings.retry') }}
            </button>
          </div>
        </div>

        <!-- Leaderboard Content -->
        <div
          v-else
          class="max-w-4xl px-4 py-8 mx-auto"
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
                    : 'text-text hover:bg-primary/50',
                ]"
              >
                {{ t(filter.label) }}
              </button>
            </div>
            <!-- <div class="text-sm text-text-secondary">{{ filteredLeaderboard.length }} players</div> -->
          </div>

          <!-- Leaderboard Table -->
          <div
            class="mx-auto overflow-hidden rounded-md shadow-lg w-max bg-background dark:bg-surface"
          >
            <div class="hidden sm:block">
              <!-- Desktop Table -->
              <table class="w-full">
                <thead class="border-b bg-surface-variant dark:bg-surface border-border">
                  <tr class="*:px-6 *:py-4 text-sm font-medium tracking-wider uppercase text-text">
                    <th class="text-left">{{ t('rankings.table.rank') }}</th>
                    <th class="text-left">{{ t('rankings.table.player') }}</th>
                    <th class="text-center">{{ t('rankings.table.games') }}</th>
                    <th class="text-center">{{ t('rankings.table.wins') }}</th>
                    <th class="text-center">{{ t('rankings.table.losses') }}</th>
                    <th class="text-center">{{ t('rankings.table.draws') }}</th>
                    <th class="text-center">{{ t('rankings.table.winRate') }}</th>
                    <th class="text-center">{{ t('rankings.table.coins') }}</th>
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
                            {{ t('rankings.player.guest') }}
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
                              : player.winRate >= 40
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
              class="py-8 mx-4 space-y-4 sm:hidden"
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
                        {{ t('rankings.player.guestShort') }}
                      </div>
                    </div>
                  </div>
                  <div
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      player.winRate >= 70
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : player.winRate >= 40
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                    ]"
                  >
                    {{ player.winRate.toFixed(1) }}%
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="text-center">
                    <div class="text-text-secondary">{{ t('rankings.table.coins') }}</div>
                    <div class="flex items-center justify-center font-medium text-text">
                      {{ player.record.coins.toLocaleString() }}
                      <img
                        src="/images/coin.webp"
                        alt="coin"
                        class="w-3 h-3 ml-1"
                      />
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">{{ t('rankings.table.games') }}</div>
                    <div class="font-medium text-text">{{ player.totalGames }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">{{ t('rankings.table.wins') }}</div>
                    <div class="font-medium text-green-600 dark:text-green-400">
                      {{ player.record.win }}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-text-secondary">{{ t('rankings.table.losses') }}</div>
                    <div class="font-medium text-red-600 dark:text-red-400">
                      {{ player.record.loss }}
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
            <p class="mb-4 text-lg text-text-secondary">{{ t('rankings.empty.noPlayers') }}</p>
            <p class="text-sm text-text-secondary">
              {{ t('rankings.empty.beTheFirst') }}
            </p>
          </div>
        </div>
      </main>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const { t } = useI18n()

definePageMeta({
  title: 'New Hanafuda | Rankings',
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
  { label: 'rankings.filters.overall', value: 'overall' },
  { label: 'rankings.filters.active', value: 'active' },
  { label: 'rankings.filters.wins', value: 'wins' },
  { label: 'rankings.filters.winrate', value: 'winrate' },
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
          avatar: data.avatar || '/avatars/flat-crane.webp', // TODO: change to default avatar
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
  img.src = '/avatars/flat-crane.webp' // TODO: change to default avatar
}

// Initialize
onMounted(() => {
  fetchLeaderboard()
})
</script>
