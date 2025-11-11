<template>
  <ContentLayout>
    <div class="min-h-screen isolate">
      <!-- Header -->
      <header
        :class="[
          'sticky top-0 z-10',
          'px-4 py-6 min-h-20 lg:py-8 bg-[url(https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/player_bar.webp)] bg-cover bg-bottom lg:px-8',
        ]"
      >
        <h1 class="text-lg font-bold text-center text-white lg:text-3xl">
          {{ t('rankings.title') }}
        </h1>
      </header>

      <!-- Filter Options -->
      <div
        :class="[
          'flex flex-wrap items-center justify-center mb-6 w-full p-4',
          'sticky mx-auto backdrop-blur-sm z-10 bg-background/30',
          isMobile ? 'top-20' : 'top-20 lg:top-25',
        ]"
      >
        <div class="flex flex-wrap gap-1">
          <button
            v-for="filter in filterOptions"
            :key="filter.value"
            @click="selectedFilter = filter.value"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition-colors w-[80px] sm:w-[150px]',
              selectedFilter === filter.value
                ? 'bg-primary/80 text-white'
                : 'text-text hover:bg-primary/50',
            ]"
          >
            {{ t(filter.label) }}
          </button>
        </div>
      </div>

      <!-- Minimum Games Note -->
      <div
        v-if="selectedFilter === 'winrate'"
        class="max-w-4xl px-4 mx-auto mb-4 text-text"
      >
        <Alert variant="default">
          <AlertDescription class="text-center">
            {{ t('rankings.minimumGamesNote', { minGames: MIN_GAMES }) }}
          </AlertDescription>
        </Alert>
      </div>

      <main class="mx-auto overflow-y-auto max-w-screen lg:px-8 touch-pan-y isolate">
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
              class="px-4 py-2 mt-4 text-white transition-colors bg-red-600 rounded-sm hover:bg-red-700"
            >
              {{ t('rankings.retry') }}
            </button>
          </div>
        </div>

        <!-- Leaderboard Content -->
        <div
          v-else
          class="max-w-4xl py-8 mx-auto"
        >
          <!-- User's Record Card -->
          <div class="max-w-sm place-content-center mx-auto px-4">
            <PlayerRankingCard
              v-if="currentUserPlayer"
              :player="currentUserPlayer"
              :rank="currentUserRank"
              :selected-filter="selectedFilter"
              :is-current-user="true"
            />
          </div>

          <div class="bg-border/50 w-3/4 mx-auto h-px mt-12 mb-4" />

          <!-- Leaderboard Ranking Cards -->
          <div class="mx-auto h-max w-max max-w-screen">
            <div
              v-if="filteredLeaderboard.length > 0"
              class="py-8 mx-4 grid lg:grid-cols-2 gap-12 max-w-screen"
            >
              <!-- Player Card -->
              <div
                v-for="(player, index) in filteredLeaderboard"
                :key="player.uid"
                class="flex justify-center w-full"
              >
                <PlayerRankingCard
                  :player="player"
                  :rank="index + 1"
                  :selected-filter="selectedFilter"
                  :is-current-user="player.uid === currentUserPlayer?.uid"
                />
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
        </div>
      </main>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const { isMobile } = useDevice()

const { t } = useI18n()

const pageTitle = computed(() => `${t('game.title')} | ${t('pages.rankings')}`)
const pageDescription = computed(() => t('pageDescriptions.rankings', { appName: t('game.title') }))

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
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
const MIN_GAMES = 50

// Reactive state
const loading = ref(true)
const error = ref(false)
const leaderboard = ref<LeaderboardPlayer[]>([])
const selectedFilter = ref('overall')

// Current user's record
const user = useProfile().current

// Convert current user to LeaderboardPlayer format
const currentUserPlayer = computed<LeaderboardPlayer | null>(() => {
  if (!user.value?.uid || !user.value?.record) return null

  const record = { ...user.value.record }
  // Adjust for coins spent (same calculation as in fetchLeaderboard)
  record.coins += Math.max((user.value.designs?.unlocked?.length || 0) - 3, 0) * 500
  const totalGames = record.win + record.loss + record.draw

  // Only show if user has played at least one game
  if (totalGames === 0) return null

  const winRate = totalGames > 0 ? (record.win / totalGames) * 100 : 0

  return {
    uid: user.value.uid,
    username: user.value.username || 'Anonymous Player',
    avatar: user.value.avatar || '/avatars/flat-crane.webp',
    record,
    totalGames,
    winRate,
    lastUpdated: user.value.lastUpdated,
    isGuest: user.value.isGuest || false,
  }
})

// Filter options
const filterOptions: FilterOption[] = [
  { label: 'rankings.filters.overall', value: 'overall' },
  { label: 'rankings.filters.active', value: 'active' },
  { label: 'rankings.filters.wins', value: 'wins' },
  { label: 'rankings.filters.winrate', value: 'winrate' },
]

// Helper function to get sorted leaderboard (without limit)
const getSortedLeaderboard = (filter: string) => {
  let sorted = [...leaderboard.value]

  switch (filter) {
    case 'active':
      sorted = sorted.sort((a, b) => b.totalGames - a.totalGames)
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

  return sorted
}

// Computed properties
const filteredLeaderboard = computed(() => {
  return getSortedLeaderboard(selectedFilter.value).slice(0, LIMIT)
})

// Calculate current user's rank based on selected filter
const currentUserRank = computed(() => {
  if (!user.value?.uid) return null

  const sorted = getSortedLeaderboard(selectedFilter.value)
  const index = sorted.findIndex((p) => p.uid === user.value?.uid)

  return index >= 0 ? index + 1 : null
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

// Initialize
onMounted(() => {
  fetchLeaderboard()
})
</script>
