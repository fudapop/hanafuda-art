<template>
  <div
    class="relative flex items-center justify-center w-full h-full min-h-screen overflow-hidden border-frame -z-10"
  >
    <!-- Dark overlay for dark mode -->
    <div
      class="absolute inset-0 z-20 duration-300 dark:bg-gradient-to-r dark:from-black/30 dark:via-black/10 dark:to-black/30"
    />
    <div class="fixed inset-0 -z-20">
      <img
        src="/images/bg-landing.webp"
        class="absolute z-5 object-cover w-full h-full dark:invert animate-ping [animation-duration:10s] motion-reduce:animate-none"
      />
      <img
        src="/images/bg-landing.webp"
        class="object-cover w-full h-full dark:invert"
      />
    </div>
    <!-- Left Oval -->
    <div
      class="fixed left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-[32vw] h-[80vh]"
    >
      <div
        class="static bg-transparent rounded-full aspect-[3/4] w-full h-full flex items-center justify-center overflow-hidden inert"
      >
        <img
          src="/images/flowers-landing1.webp"
          class="object-contain w-full h-full transition-opacity duration-300 opacity-0 lg:opacity-100"
          loading="lazy"
        />
      </div>
    </div>
    <!-- Right Oval -->
    <div
      class="fixed right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-[32vw] h-[80vh]"
    >
      <div
        class="bg-transparent rounded-full aspect-[3/4] w-full h-full flex items-center justify-center overflow-hidden inert"
      >
        <img
          src="/images/flowers-landing2.webp"
          class="object-contain w-full h-full transition-opacity duration-300 opacity-0 lg:opacity-100"
          loading="lazy"
        />
      </div>
    </div>
    <!-- Centered content -->
    <div
      :class="[
        'relative z-20 flex flex-col items-center justify-center gap-4',
        isMobile ? 'landscape:flex-row landscape:justify-around landscape:w-full' : '',
      ]"
    >
      <img
        src="/images/logo-title.webp"
        :class="['w-[120px] mb-2', isMobile ? 'landscape:w-[30dvh]' : 'sm:w-[180px]']"
        :alt="t('game.title')"
      />
      <h1 class="sr-only">{{ t('game.title') }}</h1>
      <div class="flex flex-col items-center gap-4">
        <button
          :class="[
            'rounded-sm overflow-hidden mt-12 border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 w-[150px]',
            isMobile ? 'landscape:mt-0' : 'sm:mt-24',
          ]"
          @click="$emit('start-game')"
        >
          <img
            src="/images/button-play-now.webp"
            class="w-full h-full cover"
          />
          <span class="sr-only"> {{ t('common.actions.playNow') }} </span>
        </button>

        <!-- Options Button - Only show when logged in -->
        <button
          v-if="!userIsGuest"
          class="mt-2 ring-inset action-button"
          @click="() => openOptions()"
        >
          {{ t('common.actions.options') }}
        </button>

        <!-- Leaderboard Button - Show for all users -->
        <button
          class="mt-2 uppercase ring-inset action-button max-w-none"
          @click="goToRankings"
        >
          {{ t('rankings.title') }}
        </button>

        <!-- Authentication buttons -->
        <div class="flex gap-4">
          <button
            v-if="userIsGuest"
            class="action-button"
            @click="goToLogin"
          >
            {{ t('common.actions.signUp') }}
          </button>
        </div>
        <span
          v-if="userIsGuest"
          role="link"
          @click="handleSignin"
          class="block text-sm text-center transition-colors duration-200 cursor-pointer text-text-secondary hover:underline hover:text-primary"
        >
          {{ t('navigation.signInToExistingAccount') }}
        </span>
      </div>
    </div>
    <div class="fixed bottom-0 z-50 w-full">
      <StartScreenFooter />
    </div>

    <AnnouncementModal />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['start-game'])
const { userIsGuest, logout } = useAuth()
const { isMobile } = useDevice()
const { openOptions } = useOptionsPanel()
const { t } = useI18n()
const localeRoute = useLocaleRoute()

const goToLogin = () => {
  const route = localeRoute({ name: 'sign-in', query: { signup: 'true' } })
  if (route) {
    navigateTo(route.fullPath)
  }
}

const goToRankings = () => {
  navigateTo(localeRoute('/rankings'))
}

const handleSignin = () => {
  logout()
  const route = localeRoute({ name: 'sign-in', query: { exit: 'true' } })
  if (route) {
    navigateTo(route.fullPath)
  }
}
</script>

<style scoped>
/* Double border */
.border-frame {
  position: relative;
}
.border-frame::before,
.border-frame::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 30;
  border-radius: 0;
}
.border-frame::before {
  inset: 0;
  border: 6px solid #111;
}
.border-frame::after {
  inset: 6px;
  border: 3px solid #a02c2c;
}

.inert {
  user-select: none;
  pointer-events: none;
  z-index: -50;
}
</style>
