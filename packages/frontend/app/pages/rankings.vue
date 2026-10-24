<template>
  <ContentLayout>
    <div class="min-h-screen isolate">
      <!-- Header -->
      <header
        :class="[
          'sticky top-0 z-10',
          'px-4 py-6 min-h-20 lg:py-8 bg-[url(/images/player-bar-1280.webp)] bg-cover bg-bottom lg:px-8',
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
        class="max-w-4xl px-4 mx-auto mb-4 text-text flex justify-center"
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
                  :rank="leaderboardRanks[index] ?? index + 1"
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
import { getFirestore } from 'firebase/firestore'
import {
  LEADERBOARD_MIN_GAMES,
  buildLeaderboardEntry,
  competitionRanks,
  type LeaderboardEntry,
  type LeaderboardFilter,
} from '~/utils/leaderboard'
import { fetchLeaderboardPage, fetchLeaderboardRank } from '~/utils/leaderboardQuery'

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

type FilterOption = {
  label: string
  value: LeaderboardFilter
}

const MIN_GAMES = LEADERBOARD_MIN_GAMES

const loading = ref(true)
const error = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([])
const leaderboardRanks = ref<number[]>([])
const selectedFilter = ref<LeaderboardFilter>('overall')
const currentUserRank = ref<number | null>(null)

const user = useProfile().current

const currentUserPlayer = computed<LeaderboardEntry | null>(() => {
  const profile = user.value
  if (!profile?.uid || !profile.record) return null
  const entry = buildLeaderboardEntry(profile)
  return entry?.hasGames ? entry : null
})

const filterOptions: FilterOption[] = [
  { label: 'rankings.filters.overall', value: 'overall' },
  { label: 'rankings.filters.active', value: 'active' },
  { label: 'rankings.filters.wins', value: 'wins' },
  { label: 'rankings.filters.winrate', value: 'winrate' },
]

const filteredLeaderboard = computed(() => leaderboard.value)

let requestSerial = 0

const refreshCurrentUserRank = async (serial: number, filter: LeaderboardFilter) => {
  const mine = currentUserPlayer.value
  if (!mine || (filter === 'winrate' && !mine.meetsMinGames)) {
    if (serial === requestSerial) currentUserRank.value = null
    return
  }

  const index = leaderboard.value.findIndex((player) => player.uid === mine.uid)
  if (index >= 0) {
    if (serial === requestSerial) currentUserRank.value = leaderboardRanks.value[index] ?? null
    return
  }

  const rank = await fetchLeaderboardRank(getFirestore(), filter, mine)
  if (serial === requestSerial && selectedFilter.value === filter) {
    currentUserRank.value = rank
  }
}

const fetchLeaderboard = async () => {
  const serial = ++requestSerial
  const filter = selectedFilter.value

  try {
    loading.value = true
    error.value = false

    // Wait for auth to finish initializing. Signed-out visitors can still read the public board.
    await getCurrentUser()

    const players = await fetchLeaderboardPage(getFirestore(), filter)
    if (serial !== requestSerial) return

    leaderboard.value = players
    leaderboardRanks.value = competitionRanks(players, filter)
    await refreshCurrentUserRank(serial, filter)
  } catch (err: any) {
    if (serial !== requestSerial) return
    console.error('Error fetching leaderboard:', err)

    if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
      console.warn(
        'Firestore permissions error - leaderboard may require authentication or updated security rules',
      )
    }

    error.value = true
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

watch(selectedFilter, () => {
  void fetchLeaderboard()
})

watch(
  () => {
    const mine = currentUserPlayer.value
    if (!mine) return null
    return `${mine.uid}:${mine.meetsMinGames}:${mine.totalGames}:${mine.record.coins}:${mine.record.win}:${mine.winRate}`
  },
  () => {
    if (loading.value || error.value) return
    void refreshCurrentUserRank(requestSerial, selectedFilter.value)
  },
)

onMounted(() => {
  void fetchLeaderboard()
})
</script>
