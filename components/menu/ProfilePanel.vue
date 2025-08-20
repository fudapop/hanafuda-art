<template>
  <div class="grid">
    <div
      id="user-info"
      class="grid p-4 mx-3"
    >
      <div class="sm:grid sm:grid-cols-2 sm:px-8">
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
        </div>
        <!-- END User Info Panel-->
      </div>
    </div>

    <!-- Player Record -->
    <div
      v-if="user?.record"
      class="items-center px-8 mx-2 border-t border-b h-max bg-surface border-t-border border-b-border"
    >
      <h3 class="sr-only">{{ t('profile.info.playerRecord') }}</h3>
      <dl class="flex justify-around">
        <div
          v-for="(val, key) in record"
          :key="key"
          class="px-4 py-3 overflow-hidden sm:py-5 sm:p-6"
        >
          <dt class="text-sm font-medium truncate text-text-secondary">
            {{ key }}
          </dt>
          <dd class="text-lg font-semibold tracking-tight text-text sm:text-3xl">
            {{ val }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- Account sign-in/out -->
    <div
      v-if="user?.isGuest"
      class="flex flex-col items-center justify-center h-20 gap-4 pt-4 mx-auto sm:flex-row text-text"
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
      class="flex flex-col items-center justify-center pt-4"
    >
      <LoginButton />
    </div>
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
