<template>
  <ContentLayout>
    <div class="min-h-screen bg-surface dark:bg-surface">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary to-accent py-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-white mb-2">
              🏆 Leaderboard
            </h1>
            <p class="text-primary-200">
              Top players ranked by performance and activity
            </p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <SakuraLoader />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p class="text-red-600 dark:text-red-400">
            Failed to load leaderboard data. Please try again later.
          </p>
          <button 
            @click="fetchLeaderboard" 
            class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Leaderboard Content -->
      <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Filter Options -->
        <div class="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in filterOptions"
              :key="filter.value"
              @click="selectedFilter = filter.value"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedFilter === filter.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-variant dark:bg-surface-variant text-text hover:bg-primary/10'
              ]"
            >
              {{ filter.label }}
            </button>
          </div>
          <div class="text-sm text-text-secondary">
            {{ filteredLeaderboard.length }} players
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div class="bg-white dark:bg-surface-variant rounded-lg shadow-lg overflow-hidden">
          <div class="hidden sm:block">
            <!-- Desktop Table -->
            <table class="w-full">
              <thead class="bg-surface-variant dark:bg-surface border-b border-border">
                <tr>
                  <th class="px-6 py-4 text-left text-sm font-medium text-text uppercase tracking-wider">
                    Rank
                  </th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-text uppercase tracking-wider">
                    Player
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
                    Games
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
                    Wins
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
                    Losses
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
                    Draws
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th class="px-6 py-4 text-center text-sm font-medium text-text uppercase tracking-wider">
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
                    index < 3 ? 'bg-gradient-to-r from-transparent to-primary/5' : ''
                  ]"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span v-if="index === 0" class="text-2xl mr-2">🥇</span>
                      <span v-else-if="index === 1" class="text-2xl mr-2">🥈</span>
                      <span v-else-if="index === 2" class="text-2xl mr-2">🥉</span>
                      <span class="text-sm font-medium text-text">
                        #{{ index + 1 }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <img 
                        :src="player.avatar" 
                        :alt="player.username"
                        class="h-10 w-10 rounded-full mr-3"
                        @error="handleImageError"
                      />
                      <div>
                        <div class="text-sm font-medium text-text">
                          {{ player.username }}
                        </div>
                        <div v-if="player.isGuest" class="text-xs text-text-secondary">
                          Guest Player
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm text-text">{{ player.totalGames }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm font-medium text-green-600 dark:text-green-400">
                      {{ player.record.win }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm font-medium text-red-600 dark:text-red-400">
                      {{ player.record.loss }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm text-text-secondary">{{ player.record.draw }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div 
                        :class="[
                          'px-2 py-1 rounded-full text-xs font-medium',
                          player.winRate >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          player.winRate >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        ]"
                      >
                        {{ player.winRate.toFixed(1) }}%
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <span class="text-sm text-text">{{ player.record.coins.toLocaleString() }}</span>
                      <img 
                        src="~/assets/images/coin.webp" 
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
          <div class="sm:hidden space-y-4 p-4">
            <div
              v-for="(player, index) in filteredLeaderboard"
              :key="player.uid"
              :class="[
                'bg-white dark:bg-surface rounded-lg border border-border p-4',
                index < 3 ? 'ring-2 ring-primary/20' : ''
              ]"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <span v-if="index === 0" class="text-xl mr-2">🥇</span>
                  <span v-else-if="index === 1" class="text-xl mr-2">🥈</span>
                  <span v-else-if="index === 2" class="text-xl mr-2">🥉</span>
                  <span class="text-lg font-bold text-text mr-3">#{{ index + 1 }}</span>
                  <img 
                    :src="player.avatar" 
                    :alt="player.username"
                    class="h-8 w-8 rounded-full mr-2"
                    @error="handleImageError"
                  />
                  <div>
                    <div class="font-medium text-text">{{ player.username }}</div>
                    <div v-if="player.isGuest" class="text-xs text-text-secondary">Guest</div>
                  </div>
                </div>
                <div 
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    player.winRate >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    player.winRate >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
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
                  <div class="font-medium text-green-600 dark:text-green-400">{{ player.record.win }}</div>
                </div>
                <div class="text-center">
                  <div class="text-text-secondary">Losses</div>
                  <div class="font-medium text-red-600 dark:text-red-400">{{ player.record.loss }}</div>
                </div>
                <div class="text-center">
                  <div class="text-text-secondary">Coins</div>
                  <div class="font-medium text-text flex items-center justify-center">
                    {{ player.record.coins.toLocaleString() }}
                    <img src="~/assets/images/coin.webp" alt="coin" class="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredLeaderboard.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">No players found</p>
          <p class="text-text-secondary text-sm">
            Be the first to play and appear on the leaderboard!
          </p>
        </div>
      </div>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore'

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

// Reactive state
const loading = ref(true)
const error = ref(false)
const leaderboard = ref<LeaderboardPlayer[]>([])
const selectedFilter = ref('overall')

// Filter options
const filterOptions: FilterOption[] = [
  { label: 'Overall', value: 'overall' },
  { label: 'Most Active', value: 'active' },
  { label: 'Best Win Rate', value: 'winrate' },
  { label: 'Most Wins', value: 'wins' },
  { label: 'Richest', value: 'coins' }
]

// Computed properties
const filteredLeaderboard = computed(() => {
  let sorted = [...leaderboard.value]
  
  switch (selectedFilter.value) {
    case 'active':
      sorted = sorted.filter(p => p.totalGames >= 5)
        .sort((a, b) => b.totalGames - a.totalGames)
      break
    case 'winrate':
      sorted = sorted.filter(p => p.totalGames >= 10)
        .sort((a, b) => b.winRate - a.winRate)
      break
    case 'wins':
      sorted = sorted.sort((a, b) => b.record.win - a.record.win)
      break
    case 'coins':
      sorted = sorted.sort((a, b) => b.record.coins - a.record.coins)
      break
    case 'overall':
    default:
      // Overall ranking: prioritize win rate for players with 5+ games, then by total wins
      sorted = sorted.sort((a, b) => {
        const aHasMinGames = a.totalGames >= 5
        const bHasMinGames = b.totalGames >= 5
        
        if (aHasMinGames && bHasMinGames) {
          // Both have min games, sort by win rate then total wins
          if (Math.abs(a.winRate - b.winRate) < 0.1) {
            return b.record.win - a.record.win
          }
          return b.winRate - a.winRate
        } else if (aHasMinGames) {
          return -1
        } else if (bHasMinGames) {
          return 1
        } else {
          // Neither has min games, sort by wins
          return b.record.win - a.record.win
        }
      })
      break
  }
  
  return sorted
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
          isGuest: data.isGuest || false
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

<style scoped>
/* Additional custom styles if needed */
.bg-surface {
  background-color: rgb(var(--color-surface));
}

.bg-surface-variant {
  background-color: rgb(var(--color-surface-variant));
}

.text-text {
  color: rgb(var(--color-text));
}

.text-text-secondary {
  color: rgb(var(--color-text-secondary));
}

.border-border {
  border-color: rgb(var(--color-border));
}
</style>