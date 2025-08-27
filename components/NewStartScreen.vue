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
        'relative z-20 flex flex-col items-center justify-center gap-3 pb-32 sm:pb-24 md:pb-16',
        isMobile
          ? 'landscape:flex-row landscape:justify-around landscape:w-full landscape:pb-16'
          : '',
      ]"
    >
      <img
        src="/images/logo-title.webp"
        :class="[
          'w-[100px] mb-1 sm:w-[120px] sm:mb-2',
          isMobile ? 'landscape:w-[25dvh]' : 'md:w-[180px]',
        ]"
        :alt="t('game.title')"
      />
      <h1 class="sr-only">{{ t('game.title') }}</h1>
      <div class="flex flex-col items-center gap-3 sm:gap-4">
        <button
          :class="[
            'play-now-button rounded-sm mt-6 sm:mt-12 border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
            'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-200 dark:to-amber-300',
            'text-[#23221c] font-bold text-lg',
            'hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-300 dark:hover:to-amber-400',
            'active:from-amber-300 active:to-amber-400',
            'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
            isMobile ? 'landscape:mt-0' : 'md:mt-24',
          ]"
          @click="$emit('start-game')"
        >
          {{ t('common.actions.playNow') }}
        </button>

        <!-- Options Button - Only show when logged in -->
        <button
          v-if="!userIsGuest"
          class="min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-sm sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
          @click="() => openOptions()"
        >
          {{ t('common.actions.options') }}
        </button>

        <!-- Leaderboard Button - Show for all users -->
        <button
          v-if="!userIsGuest"
          class="uppercase min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-sm sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
          @click="goToRankings"
        >
          {{ t('rankings.title') }}
        </button>

        <!-- Authentication buttons -->
        <div class="flex gap-4">
          <button
            v-if="userIsGuest"
            class="min-w-[120px] px-6 py-2 text-sm font-semibold transition-all duration-200 border rounded-sm text-text bg-surface border-border hover:bg-surface/80 hover:border-primary/50"
            @click="goToLogin"
          >
            {{ t('common.actions.signUp') }}
          </button>
        </div>
        <span
          v-if="userIsGuest"
          role="link"
          @click="handleSignin"
          class="block px-2 text-xs text-center transition-colors duration-200 cursor-pointer sm:text-sm text-text-secondary hover:underline hover:text-primary"
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
