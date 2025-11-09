<template>
  <div
    :class="[
      'rounded-md shadow-lg bg-background dark:bg-surface border-border border p-4',
      isCurrentUser &&
        'relative after:size-full after:absolute after:scale-[1.02] after:animate-pulse after:bg-black after:inset-0 after:-z-10 ' +
          'after:rounded-md after:bg-linear-to-br after:to-accent after:from-hanafuda-green',
    ]"
  >
    <!-- Player Info -->
    <div class="flex items-center justify-between mb-3 w-full">
      <div class="flex items-center">
        <span class="mr-3 text-2xl font-bold text-text">
          {{ rank ? `#${rank}` : '—' }}
        </span>
        <img
          :src="player.avatar"
          :alt="player.username"
          class="size-12 mr-2 rounded-full"
          @error="handleImageError"
        />
      </div>
      <div>
        <div class="font-bold text-text text-lg text-balance">{{ player.username }}</div>
        <div
          v-if="player.isGuest"
          class="text-sm text-text-secondary"
        >
          {{ t('rankings.player.guestShort') }}
        </div>
      </div>
    </div>

    <!-- Win-Loss-Draw Record Card -->
    <div class="w-full grid grid-cols-2 items-center max-w-xs py-8">
      <!-- Left Column -->
      <div class="grid grid-cols-2 place-items-start gap-2">
        <!-- Coins -->
        <div
          :class="[
            'flex items-center justify-center gap-1',
            selectedFilter === 'overall' ? 'col-span-2 order-first text-2xl' : 'col-span-1 text-lg',
            selectedFilter === 'winrate' && 'col-span-2',
          ]"
        >
          <span class="sr-only">
            {{ t('rankings.table.coins') }}
          </span>
          <div class="flex items-center gap-x-2 font-medium text-text">
            <img
              src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/coin.webp"
              alt="coin"
              :class="selectedFilter === 'overall' ? 'size-5' : 'size-4'"
            />
            {{ player.record.coins.toLocaleString() }}
          </div>
        </div>

        <!-- Games Played -->
        <div
          :class="[
            'flex items-center justify-center gap-1',
            selectedFilter === 'active' ? 'col-span-2 order-first text-2xl' : 'col-span-1 text-lg',
          ]"
        >
          <span class="sr-only">
            {{ t('rankings.table.games') }}
          </span>
          <div class="flex items-center gap-x-2 font-medium text-text">
            <Icon name="mdi:gamepad-variant" />
            {{ player.totalGames.toLocaleString() }}
          </div>
        </div>

        <!-- Wins -->
        <div
          :class="[
            'flex items-center justify-center gap-1',
            selectedFilter === 'wins' ? 'col-span-2 order-first text-2xl' : 'col-span-1 text-lg',
          ]"
        >
          <span class="sr-only">
            {{ t('rankings.table.wins') }}
          </span>
          <div class="flex items-center gap-x-2 font-medium text-text">
            <Icon
              name="mdi:trophy"
              class="text-green-600"
            />
            {{ player.record.win.toLocaleString() }}
          </div>
        </div>

        <!-- Losses -->
        <div class="text-lg flex items-center justify-center gap-1">
          <span class="sr-only">
            {{ t('rankings.table.losses') }}
          </span>
          <div class="flex items-center gap-x-2 font-medium text-text">
            <Icon
              name="mdi:close"
              class="text-red-500"
            />
            {{ player.record.loss.toLocaleString() }}
          </div>
        </div>

        <!-- Draws -->
        <div class="text-lg flex items-center justify-center gap-1">
          <span class="sr-only">
            {{ t('rankings.table.draws') }}
          </span>
          <div class="flex items-center gap-x-2 font-medium text-text">
            <Icon
              name="ic:round-handshake"
              class="text-yellow-500"
            />
            {{ player.record.draw.toLocaleString() }}
          </div>
        </div>
      </div>
      <!-- Right Column -->
      <div class="flex justify-center relative">
        <DonutChart
          hide-legend
          :data="[player.record.win, player.record.loss, player.record.draw]"
          :categories="chartCategories"
          :height="144"
          :radius="5"
          :arc-width="12"
          :pad-angle="0.02"
        />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            :class="[
              'text-text transition',
              selectedFilter === 'winrate' ? 'font-bold text-2xl' : 'font-medium text-lg',
            ]"
          >
            {{ player.winRate.toFixed(1) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type LeaderboardPlayer = {
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

type Props = {
  player: LeaderboardPlayer
  rank: number | null
  selectedFilter: string
  isCurrentUser?: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()

const chartCategories = Object.fromEntries(
  [
    { name: t('profile.stats.wins'), color: '#16a34a' }, // green-600
    { name: t('profile.stats.losses'), color: '#ef4444' }, // red-500
    { name: t('profile.stats.draws'), color: '#eab308' }, // yellow-500
  ].map((i) => [i.name, { name: i.name, color: i.color }]),
)

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/avatars/flat-crane.webp' // TODO: change to default avatar
}
</script>
