<template>
  <div
    class="relative flex items-center justify-center w-full h-full min-h-screen overflow-hidden border-frame -z-10"
  >
    <!-- Dark overlay for dark mode -->
    <div
      class="absolute inset-0 z-20 duration-300 dark:bg-linear-to-r dark:from-black/30 dark:via-black/10 dark:to-black/30"
    />
    <div class="fixed inset-0 -z-20">
      <img
        src="/images/bg-landing-1920.webp"
        srcset="
          /images/bg-landing-640.webp   640w,
          /images/bg-landing-768.webp   768w,
          /images/bg-landing-1024.webp 1024w,
          /images/bg-landing-1280.webp 1280w,
          /images/bg-landing-1536.webp 1536w,
          /images/bg-landing-1920.webp 1920w
        "
        class="absolute z-5 object-cover w-full h-full dark:invert animate-ping [animation-duration:10s] motion-reduce:animate-none"
        width="1920"
        height="1091"
        sizes="(min-width: 1536px) 100vw, (min-width: 1280px) 75vw, (min-width: 768px) 50vw, 100vw"
        alt="animated background overlay"
      />
      <img
        src="/images/bg-landing-1920.webp"
        srcset="
          /images/bg-landing-640.webp   640w,
          /images/bg-landing-768.webp   768w,
          /images/bg-landing-1024.webp 1024w,
          /images/bg-landing-1280.webp 1280w,
          /images/bg-landing-1536.webp 1536w,
          /images/bg-landing-1920.webp 1920w
        "
        class="object-cover w-full h-full dark:invert"
        width="1920"
        height="1091"
        sizes="(min-width: 1536px) 100vw, (min-width: 1280px) 75vw, (min-width: 768px) 50vw, 100vw"
        alt="background-image"
      />
    </div>
    <!-- Left Oval -->
    <div
      class="fixed left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-[32vw] h-[80vh]"
    >
      <div
        class="static bg-transparent rounded-full aspect-3/4 w-full h-full flex items-center justify-center overflow-hidden inert"
      >
        <img
          src="/images/flowers-landing1-704.webp"
          srcset="
            /images/flowers-landing1-128.webp 128w,
            /images/flowers-landing1-192.webp 192w,
            /images/flowers-landing1-256.webp 256w,
            /images/flowers-landing1-384.webp 384w,
            /images/flowers-landing1-512.webp 512w,
            /images/flowers-landing1-704.webp 704w
          "
          class="object-contain w-full h-full transition-opacity duration-300 opacity-0 lg:opacity-100"
          width="704"
          height="1080"
          sizes="32vw"
          alt=""
        />
      </div>
    </div>
    <!-- Right Oval -->
    <div
      class="fixed right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-[32vw] h-[80vh]"
    >
      <div
        class="bg-transparent rounded-full aspect-3/4 w-full h-full flex items-center justify-center overflow-hidden inert"
      >
        <img
          src="/images/flowers-landing2-704.webp"
          srcset="
            /images/flowers-landing2-128.webp 128w,
            /images/flowers-landing2-192.webp 192w,
            /images/flowers-landing2-256.webp 256w,
            /images/flowers-landing2-384.webp 384w,
            /images/flowers-landing2-512.webp 512w,
            /images/flowers-landing2-704.webp 704w
          "
          class="object-contain w-full h-full transition-opacity duration-300 opacity-0 lg:opacity-100"
          width="704"
          height="1080"
          sizes="32vw"
          alt=""
        />
      </div>
    </div>

    <!-- Top-left logo link to full game -->
    <a
      href="https://newhanafuda.art"
      target="_blank"
      rel="noopener noreferrer"
      class="fixed top-4 left-4 z-30 flex items-center gap-2 group"
      :title="t('demo.playFullGame')"
    >
      <img
        src="/images/logo-title-180.webp"
        srcset="
          /images/logo-title-100.webp 100w,
          /images/logo-title-120.webp 120w,
          /images/logo-title-180.webp 180w
        "
        class="w-[60px] opacity-80 group-hover:opacity-100 transition-opacity duration-200"
        :alt="t('game.title')"
        sizes="60px"
      />
      <span class="sr-only">
        {{ t('demo.playFullGame') }}
      </span>
    </a>

    <!-- Centered content -->
    <div
      :class="[
        'relative z-20 flex flex-col items-center justify-center gap-3 pb-32 sm:pb-24 md:pb-16',
        isMobile
          ? 'landscape:flex-row landscape:justify-around landscape:w-full landscape:pb-16'
          : '',
      ]"
    >
      <!-- Animated Cards -->
      <div class="relative size-72">
        <img
          src="~/assets/otwarte-karty-logo.svg"
          alt=""
          class="absolute bottom-0 inset-x-0 mx-auto object-contain w-48 aspect-square duration-1000 motion-safe:animate-fade-in-up"
        />
        <div class="absolute top-1/4 inset-x-0 mx-auto">
          <AnimatedCards />
        </div>
      </div>
      <h1 class="sr-only">{{ t('game.title') }}</h1>

      <div class="flex flex-col items-center gap-6 sm:gap-8">
        <!-- Play Now Button -->
        <button
          :class="[
            'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[150px] sm:min-w-[180px] h-[55px] sm:h-[60px] p-3',
            'bg-linear-to-b from-amber-100 to-amber-200 dark:from-amber-200 dark:to-amber-300',
            'text-[#23221c] font-bold text-xl',
            'hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-300 dark:hover:to-amber-400',
            'active:from-amber-300 active:to-amber-400',
            'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
          ]"
          @click="startGame"
        >
          {{ t('common.actions.playNow') }}
        </button>

        <div class="flex flex-col gap-1">
          <!-- Options Button -->
          <button
            class="min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-xs sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
            @click="() => openOptions()"
          >
            {{ t('common.actions.options') }}
          </button>
        </div>
      </div>
    </div>
    <div class="fixed bottom-0 z-50 w-full">
      <StartScreenFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '~~/stores/configStore'

const emit = defineEmits(['start-game'])
const {
  current: currentProfile,
  hasLocalProfile,
  getLocalData,
  loadLocalGuestProfile,
} = useProfile()
const { openOptions } = useOptionsPanel()
const { t } = useI18n()

const { isMobile } = useDevice()

const config = useConfigStore()

// Card design composable
const { currentDesign, saveDesignToStorage } = useCardDesign()

/**
 * Initialize config store from the loaded profile settings, if available.
 */
const initializeSettingsFromProfile = () => {
  if (!currentProfile.value?.settings) return
  if (config.settingsLoaded === true) return

  console.info('Loading user settings', currentProfile.value.settings)
  config.loadUserSettings(currentProfile.value.settings as any)
}

/**
 * Initialize the current card design (locked to OpenCards in demo mode)
 */
const initializeDesignFromProfile = () => {
  // Demo mode: always use OpenCards deck
  currentDesign.value = SYSTEM_DEFAULT_DESIGN
  saveDesignToStorage(currentDesign.value)
}

onMounted(async () => {
  // Initialize settings and design
  initializeSettingsFromProfile()
  initializeDesignFromProfile()

  // Load existing guest profile if available
  if (!currentProfile.value) {
    try {
      const hasGuest = await hasLocalProfile('guest_profile')
      if (hasGuest) {
        const existingGuest = await getLocalData('guest_profile')
        if (existingGuest) {
          await loadLocalGuestProfile(existingGuest)
          initializeSettingsFromProfile()
        }
      }
    } catch (error) {
      console.error('Failed to load existing guest profile:', error)
    }
  }
})

// React to profile loading after StartScreen has mounted.
watch(
  currentProfile,
  (newProfile) => {
    if (!newProfile) return
    initializeSettingsFromProfile()
    initializeDesignFromProfile()
  },
  { flush: 'post' },
)

/**
 * Ensure there is a guest profile before starting the game.
 */
const ensurePlayerProfile = async () => {
  if (!currentProfile.value) {
    const { createLocalGuestProfile } = await import('~/composables/usePlayerProfile')
    const { loadLocalGuestProfile } = useProfile()

    const guestProfile = await createLocalGuestProfile()
    await loadLocalGuestProfile(guestProfile)
  }

  initializeSettingsFromProfile()
  initializeDesignFromProfile()
}

const startGame = async () => {
  await ensurePlayerProfile()
  emit('start-game')
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
