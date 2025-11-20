<template>
  <div class="flex flex-col pb-12 overflow-x-hidden">
    <div
      id="user-info"
      class="grid p-4 mx-3"
    >
      <div class="sm:grid sm:grid-cols-2 sm:px-8 order-1">
        <!-- Avatar -->
        <div
          v-if="user"
          class="relative mx-auto w-max group"
        >
          <AvatarSelect v-model="avatar">
            <PencilSquareIcon
              class="absolute right-0 w-5 h-auto opacity-50 text-text-secondary bottom-4 group-hover:opacity-100"
            />
            <img
              class="w-32 h-auto mx-auto my-2 border rounded-full sm:my-4 sm:w-36 border-border drop-shadow-xs"
              :src="user.avatar"
              :alt="user.username"
            />
          </AvatarSelect>
        </div>

        <!-- START User Info Panel-->
        <div class="flex flex-col justify-center text-center sm:text-left sm:items-start gap-y-2">
          <!-- Username -->
          <div class="relative h-10">
            <input
              ref="usernameInputRef"
              class="w-full h-full text-lg font-semibold border-none rounded-xs peer text-text bg-surface focus:bg-background focus:outline-hidden focus-visible:outline-hidden ring-1 ring-border focus-visible:ring-primary"
              type="text"
              v-model="usernameInputVal"
              @keyup.enter="handleInputEnter"
              autofocus
            />
            <PencilSquareIcon
              class="pointer-events-none absolute bottom-0 right-0 w-5 h-5 mr-1 mb-2.5 opacity-50 text-text-secondary peer-hover:opacity-100 peer-focus:hidden"
            />
          </div>

          <!-- Player Coins -->
          <div
            v-if="user?.record"
            class="flex items-center justify-center px-4 gap-x-2 sm:justify-start"
          >
            <img
              src="/images/coin.webp"
              alt="coin"
              class="w-5 h-5"
            />
            <p class="text-lg font-semibold select-none text-text">
              {{ user.record.coins }}
            </p>
          </div>

          <!-- Last Played -->
          <div v-if="user">
            <p class="px-4 text-text">
              {{ t('profile.info.lastUpdated') }}
              <span class="block mt-1 text-sm text-text-secondary">{{
                useDateFormat(user.lastUpdated, 'MMM-DD-YYYY HH:mm').value
              }}</span>
            </p>
          </div>

          <!-- Sync Status (for authenticated users only) -->
          <div
            v-if="!user?.isGuest"
            class="mx-auto"
          >
            <SyncStatusIndicator />
          </div>
        </div>
        <!-- END User Info Panel-->
      </div>
    </div>

    <!-- Account sign-in/out -->
    <div
      v-if="user?.isGuest"
      class="flex flex-col items-center justify-center h-20 gap-4 mx-auto sm:flex-row text-text"
    >
      <div>
        <ExclamationCircleIcon class="inline w-6 h-6 align-top" />
        <p class="inline ml-2 text-sm w-max">{{ t('auth.notices.signInRequired') }}</p>
      </div>
      <button
        class="action-button"
        @click="handleSignIn"
      >
        {{ t('common.actions.signIn') }}
      </button>
    </div>
    <div
      v-else
      class="order-last flex flex-col items-center justify-center pt-4"
    >
      <LoginButton />
    </div>

    <!-- Games & Rounds Played -->
    <div class="flex-1">
      <div
        v-if="user?.record"
        class="mx-2 my-3 grow grid sm:grid-cols-2 gap-3"
      >
        <HorizontalBarStatCard
          icon="mdi:trophy"
          :label="t('profile.stats.gamesCompleted')"
          :wins="user.record.win"
          :losses="user.record.loss"
          :draws="user.record.draw"
          @click="showGamesModal = true"
        />

        <HorizontalBarStatCard
          icon="mdi:gamepad-variant"
          :label="t('profile.stats.totalRoundsPlayed')"
          :wins="user.stats.roundsPlayed_win"
          :losses="user.stats.roundsPlayed_loss"
          :draws="user.stats.roundsPlayed_draw"
          @click="showRoundsModal = true"
        />
      </div>
    </div>

    <!-- Detailed Stats -->
    <PlayerStatsPanel />

    <!-- Games Played Breakdown Modal -->
    <DonutChartModal
      v-if="user?.record"
      :open="showGamesModal"
      :title="t('profile.stats.gamesBreakdown')"
      :data="gamesChartData"
      :categories="gamesChartCategories"
      :center-data="{ name: 'W/L %', value: `${(gamesWinRatio * 100).toFixed(2)}%` }"
      @close="showGamesModal = false"
    >
      <template #legend>
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="mdi:trophy"
                class="w-10 h-10 text-green-600 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.wins') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.record.win }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="mdi:close"
                class="w-10 h-10 text-red-500 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.losses') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.record.loss }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="ic:round-handshake"
                class="w-10 h-10 text-yellow-500 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.draws') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.record.draw }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DonutChartModal>

    <!-- Rounds Played Breakdown Modal -->
    <DonutChartModal
      v-if="user?.stats"
      :open="showRoundsModal"
      :title="t('profile.stats.roundsBreakdown')"
      :data="roundsChartData"
      :categories="roundsChartCategories"
      :center-data="{ name: 'W/L %', value: `${(roundsWinRatio * 100).toFixed(2)}%` }"
      :start-date="startDate"
      @close="showRoundsModal = false"
    >
      <template #legend>
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="mdi:trophy"
                class="w-10 h-10 text-green-600 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.wins') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.stats.roundsPlayed_win }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="mdi:close"
                class="w-10 h-10 text-red-500 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.losses') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.stats.roundsPlayed_loss }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="shrink-0">
              <Icon
                name="ic:round-handshake"
                class="w-10 h-10 text-yellow-500 mt-0.5"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-text capitalize">{{ t('profile.stats.draws') }}</strong>
                <span class="text-lg font-bold text-text">{{ user.stats.roundsPlayed_draw }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DonutChartModal>
  </div>
</template>

<script setup lang="ts">
import { ExclamationCircleIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { onClickOutside, useDateFormat } from '@vueuse/core'

const { t } = useI18n()

const user = useProfile().current
const avatar = computed({
  get: () => user.value?.avatar ?? '',
  set: (url: string) => {
    if (user.value) user.value.avatar = url.replace(window.location.origin, '')
  },
})
const username = computed({
  get: () => user.value?.username ?? '',
  set: (username: string) => {
    if (user.value) user.value.username = username
  },
})

const startDate = computed(() => normalizeTimestamp(user.value?.stats._meta.createdAt))

// Games & Rounds Played Modals
const showGamesModal = ref(false)
const showRoundsModal = ref(false)

// Chart data for modals
const gamesChartData = computed(() => [
  user.value?.record.win || 0,
  user.value?.record.loss || 0,
  user.value?.record.draw || 0,
])

const gamesWinRatio = computed(() => {
  if ((user.value?.record.win || 0) + (user.value?.record.loss || 0) === 0) return 0
  return (
    (user.value?.record.win || 0) / ((user.value?.record.win || 0) + (user.value?.record.loss || 0))
  )
})

const roundsChartData = computed(() => [
  user.value?.stats.roundsPlayed_win || 0,
  user.value?.stats.roundsPlayed_loss || 0,
  user.value?.stats.roundsPlayed_draw || 0,
])

const roundsWinRatio = computed(() => {
  if ((user.value?.stats.roundsPlayed_win || 0) + (user.value?.stats.roundsPlayed_loss || 0) === 0)
    return 0
  return (
    (user.value?.stats.roundsPlayed_win || 0) /
    ((user.value?.stats.roundsPlayed_win || 0) + (user.value?.stats.roundsPlayed_loss || 0))
  )
})

const chartLabels = computed(() => [
  { name: t('profile.stats.wins'), color: '#16a34a' }, // green-600
  { name: t('profile.stats.losses'), color: '#ef4444' }, // red-500
  { name: t('profile.stats.draws'), color: '#eab308' }, // yellow-500
])

const gamesChartCategories = computed(() =>
  Object.fromEntries(chartLabels.value.map((i) => [i.name, { name: i.name, color: i.color }])),
)

const roundsChartCategories = computed(() =>
  Object.fromEntries(chartLabels.value.map((i) => [i.name, { name: i.name, color: i.color }])),
)

const usernameInputRef: Ref<HTMLInputElement | null> = ref(null)
const usernameInputVal = ref(username.value)

const handleInputEnter = () => {
  username.value = usernameInputVal.value
}
onClickOutside(usernameInputRef, () => {
  username.value = usernameInputVal.value
})

const localeRoute = useLocaleRoute()
const handleSignIn = () => {
  const route = localeRoute({ name: 'sign-in', query: { signup: 'true' } })
  if (route) {
    navigateTo(route.fullPath)
  }
}
</script>
