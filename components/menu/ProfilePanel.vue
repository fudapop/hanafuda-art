<template>
  <div class="grid">
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
              class="w-32 h-auto mx-auto my-2 border rounded-full sm:my-4 sm:w-36 border-border drop-shadow-sm"
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
              class="w-full h-full text-lg font-semibold border-none rounded-sm peer text-text bg-surface focus:bg-background focus:outline-none focus-visible:outline-none ring-1 ring-border focus-visible:ring-primary"
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
              src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/coin.webp"
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
            class="px-4 mt-2"
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

    <!-- Player Record -->
    <div
      v-if="user?.record"
      class="mx-2 my-3 rounded-lg bg-surface border border-border overflow-hidden"
    >
      <h3 class="sr-only">{{ t('profile.info.playerRecord') }}</h3>
      <dl class="flex justify-around p-2">
        <div
          v-for="(val, key) in record"
          :key="key"
          class="px-4 py-4 overflow-hidden text-center flex-1"
        >
          <dt class="text-sm font-medium truncate text-text-secondary capitalize">
            {{ key }}
          </dt>
          <dd class="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {{ val }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- Detailed Stats -->
    <div
      v-if="user?.stats"
      class="mx-2 my-3"
    >
      <!-- Overview Stats Cards -->
      <div class="grid grid-cols-3 gap-3 mb-3">
        <div class="rounded-lg bg-surface border border-border p-3">
          <dt class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
            <Icon name="mdi:cards-variant" />
            {{ t('profile.stats.totalCardsCaptured') }}
          </dt>
          <dd class="text-2xl font-bold text-text">
            {{ user.stats.totalCardsCaptured }}
          </dd>
        </div>
        <div class="rounded-lg bg-surface border border-border p-3">
          <dt class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
            <!-- <span class="text-base">🎯</span> -->
            <Icon name="mdi:cards" />
            {{ t('profile.stats.totalYakuCompleted') }}
          </dt>
          <dd class="text-2xl font-bold text-text">
            {{ user.stats.totalYakuCompleted }}
          </dd>
        </div>
        <div class="rounded-lg bg-surface border border-border p-3">
          <dt class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
            <Icon name="mdi:gamepad-variant" />
            {{ t('profile.stats.totalRoundsPlayed') }}
          </dt>
          <dd class="text-2xl font-bold text-text">
            {{ user.stats.totalRoundsPlayed }}
          </dd>
        </div>
      </div>

      <!-- Koi-Koi Calls -->
      <div class="rounded-lg bg-surface border border-border p-3 mb-3">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-text-secondary">
            {{ t('profile.stats.koikoiCalls') }}
          </h4>
          <button
            @click="showKoikoiHelp = true"
            class="hover:opacity-70 transition-opacity"
            type="button"
          >
            <QuestionMarkCircleIcon class="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <dl class="grid grid-cols-3 gap-3">
          <div class="text-center">
            <dt
              class="text-sm font-medium text-text-secondary flex items-center justify-center gap-1.5 mb-2"
            >
              <Icon name="mdi:check" />
              {{ t('profile.stats.koikoiSuccess') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.koikoiCalled_success }}
            </dd>
          </div>
          <div class="text-center">
            <dt
              class="text-sm font-medium text-text-secondary flex items-center justify-center gap-1.5 mb-2"
            >
              <Icon name="mdi:close" />
              {{ t('profile.stats.koikoiFail') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.koikoiCalled_fail }}
            </dd>
          </div>
          <div class="text-center">
            <dt
              class="text-sm font-medium text-text-secondary flex items-center justify-center gap-1.5 mb-2"
            >
              <Icon name="mdi:sync" />
              {{ t('profile.stats.koikoiReversal') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.koikoiCalled_reversal }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Cards by Type -->
      <div class="rounded-lg bg-surface border border-border p-3">
        <h4 class="text-sm font-semibold text-text-secondary mb-3">
          {{ t('profile.stats.cardsCapturedByType') }}
        </h4>
        <dl class="grid grid-cols-4 gap-3">
          <div class="text-center">
            <dt class="text-sm font-medium text-text-secondary mb-2 capitalize">
              <Icon
                name="material-symbols:sunny"
                class="mb-1"
              />
              {{ t('game.cardTypes.brights') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.cardsCaptured_bright }}
            </dd>
          </div>
          <div class="text-center">
            <dt class="text-sm font-medium text-text-secondary mb-2 capitalize">
              <Icon
                name="lucide:panda"
                class="mb-1"
              />
              {{ t('game.cardTypes.animals') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.cardsCaptured_animal }}
            </dd>
          </div>
          <div class="text-center">
            <dt class="text-sm font-medium text-text-secondary mb-2 capitalize">
              <Icon
                name="game-icons:scroll-unfurled"
                class="mb-1"
              />
              {{ t('game.cardTypes.ribbons') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.cardsCaptured_ribbon }}
            </dd>
          </div>
          <div class="text-center">
            <dt class="text-sm font-medium text-text-secondary mb-2 capitalize">
              <Icon
                name="ph:plant-fill"
                class="mb-1"
              />
              {{ t('game.cardTypes.plains') }}
            </dt>
            <dd class="text-xl font-bold text-text">
              {{ user.stats.cardsCaptured_plain }}
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Koi-Koi Help Modal -->
    <Modal :open="showKoikoiHelp">
      <template #title>
        {{ t('profile.help.koikoiStats.title') }}
      </template>
      <template #description>
        <div class="space-y-4 text-left px-2">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <CheckCircleIcon class="w-10 h-10 text-green-500 mt-0.5" />
            </div>
            <div class="flex-1">
              <strong class="text-text block mb-2">{{ t('profile.stats.koikoiSuccess') }}</strong>
              <p class="text-sm text-text-secondary leading-relaxed">
                {{ t('profile.help.koikoiStats.success') }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <XCircleIcon class="w-10 h-10 text-red-500 mt-0.5" />
            </div>
            <div class="flex-1">
              <strong class="text-text block mb-2">{{ t('profile.stats.koikoiFail') }}</strong>
              <p class="text-sm text-text-secondary leading-relaxed">
                {{ t('profile.help.koikoiStats.fail') }}
              </p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <ArrowPathIcon class="w-10 h-10 text-primary mt-0.5" />
            </div>
            <div class="flex-1">
              <strong class="text-text block mb-2">{{ t('profile.stats.koikoiReversal') }}</strong>
              <p class="text-sm text-text-secondary leading-relaxed">
                {{ t('profile.help.koikoiStats.reversal') }}
              </p>
            </div>
          </div>
        </div>
      </template>
      <template #actions>
        <div class="flex justify-center mt-6">
          <button
            class="action-button"
            @click="showKoikoiHelp = false"
          >
            {{ t('common.actions.gotIt') }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'
import { onClickOutside, useDateFormat } from '@vueuse/core'

const { t } = useI18n()

const showKoikoiHelp = ref(false)

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
const record = computed(() => ({
  [t('profile.stats.wins')]: Number(user.value?.record.win),
  [t('profile.stats.losses')]: Number(user.value?.record.loss),
  [t('profile.stats.draws')]: Number(user.value?.record.draw),
}))

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
