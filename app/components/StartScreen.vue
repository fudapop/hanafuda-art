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
        src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/bg-landing.webp"
        class="absolute z-5 object-cover w-full h-full dark:invert animate-ping [animation-duration:10s] motion-reduce:animate-none"
      />
      <img
        src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/bg-landing.webp"
        class="object-cover w-full h-full dark:invert"
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
          src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/flowers-landing1.webp"
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
        class="bg-transparent rounded-full aspect-3/4 w-full h-full flex items-center justify-center overflow-hidden inert"
      >
        <img
          src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/flowers-landing2.webp"
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
        src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/logo-title.webp"
        :class="[
          'w-[100px] mb-1 sm:w-[120px] sm:mb-2',
          isMobile ? 'landscape:w-[25dvh]' : 'md:w-[180px]',
        ]"
        :alt="t('game.title')"
      />
      <h1 class="sr-only">{{ t('game.title') }}</h1>

      <div class="flex flex-col items-center gap-3 sm:gap-4 mt-12">
        <!-- Resume Game Button - shown when save exists -->
        <div
          v-if="hasSavedGame"
          class="flex flex-col items-center"
        >
          <button
            :class="[
              'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
              'bg-linear-to-b from-green-100 to-green-200 dark:from-green-200 dark:to-green-300',
              'text-[#23221c] font-bold text-lg',
              'hover:from-green-200 hover:to-green-300 dark:hover:from-green-300 dark:hover:to-green-400',
              'active:from-green-300 active:to-green-400',
              'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
              isMobile ? 'landscape:mt-8' : '',
            ]"
            @click="resumeGame"
            :disabled="isLoading"
          >
            {{ isLoading ? t('common.actions.loading') : t('game.actions.resumeGame') }}
          </button>

          <!-- Game State Management Panel - only show when save exists -->
          <div class="flex flex-col items-center gap-2 mt-4">
            <div class="text-xs text-text-secondary">
              {{ t('game.saveInfo.lastSaved') }}: {{ formatSaveDate(lastSave?.timestamp) }}
            </div>
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-xs font-medium text-red-500 transition-colors duration-300 border border-red-300 rounded-xs hover:bg-red-50 hover:border-red-400"
                @click="deleteSave"
                :title="t('game.actions.deleteSave')"
              >
                {{ t('common.actions.delete') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Play Now Button - shown when no save exists -->
        <button
          v-else
          :class="[
            'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
            'bg-linear-to-b from-amber-100 to-amber-200 dark:from-amber-200 dark:to-amber-300',
            'text-[#23221c] font-bold text-lg',
            'hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-300 dark:hover:to-amber-400',
            'active:from-amber-300 active:to-amber-400',
            'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
            isMobile ? 'landscape:mt-0' : '',
          ]"
          @click="startNewGame"
        >
          {{ t('common.actions.playNow') }}
        </button>

        <!-- Options Button - Show for everyone -->
        <button
          class="min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-xs sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
          @click="() => openOptions()"
        >
          {{ t('common.actions.options') }}
        </button>

        <!-- Leaderboard Button - Only for authenticated users -->
        <button
          v-if="!isGuest"
          class="uppercase min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-xs sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
          @click="goToRankings"
        >
          {{ t('rankings.title') }}
        </button>

        <!-- Sign In Button - For guests (replaces Rankings) -->
        <button
          v-if="isGuest"
          class="uppercase min-w-[120px] px-4 py-2 mt-1 text-sm font-medium transition-all duration-200 bg-transparent border rounded-xs sm:mt-2 text-text-secondary border-border/30 hover:bg-surface/50 hover:border-border/60 hover:text-text"
          @click="goToLogin"
        >
          {{ t('common.actions.signIn') }}
        </button>
      </div>
    </div>
    <div class="fixed bottom-0 z-50 w-full">
      <StartScreenFooter />
    </div>

    <AnnouncementModal />
  </div>
</template>

<script setup lang="ts">
import { useScreenOrientation } from '@vueuse/core'
const emit = defineEmits(['start-game'])
const { current: currentProfile } = useProfile()
const { openOptions } = useOptionsPanel()
const { t } = useI18n()
const localeRoute = useLocaleRoute()

const { isMobile } = useDevice()
const { orientation } = useScreenOrientation()

// Determine if user is a guest based on profile flag
const isGuest = computed(() => currentProfile.value?.isGuest === true)

// Game save management
const { listSavedGames, deleteSavedGame } = useStoreManager()
const isLoading = ref(false)

// Check for saved games (only use the most recent one)
const savedGames = ref(listSavedGames())
const hasSavedGame = computed(() => savedGames.value.length > 0)
const lastSave = computed(() => savedGames.value[0] || null)

// Check for saved games on mount only
onMounted(() => {
  savedGames.value = listSavedGames()
})

const goToLogin = () => {
  const route = localeRoute({ name: 'sign-in' })
  if (route) {
    navigateTo(route.fullPath)
  }
}

const goToRankings = () => {
  navigateTo(localeRoute('/rankings'))
}

// Game save handlers
const resumeGame = async () => {
  if (!lastSave.value) return

  isLoading.value = true
  try {
    // Set global state to indicate we're resuming from save
    const resumeState = useState('resume-save', () => ({
      isResuming: false,
      saveKey: '',
      saveData: null as any,
    }))

    // Pre-load the save data but don't apply it yet
    const serializedData = localStorage.getItem(lastSave.value.key)
    if (serializedData) {
      const gameState = JSON.parse(serializedData)

      // Store the save data and key for later loading
      resumeState.value = {
        isResuming: true,
        saveKey: lastSave.value.key,
        saveData: gameState,
      }

      // Start the game - it will handle the deferred loading
      emit('start-game')
    } else {
      console.error('Failed to find saved game data')
    }
  } catch (error) {
    console.error('Error preparing resume:', error)
  } finally {
    isLoading.value = false
  }
}

const startNewGame = () => {
  // Clear any existing saves when starting new game (single save slot)
  if (hasSavedGame.value && lastSave.value) {
    deleteSavedGame(lastSave.value.key)
    savedGames.value = listSavedGames()
  }

  // Clear resume state to ensure normal game initialization
  const resumeState = useState('resume-save', () => ({
    isResuming: false,
    saveKey: '',
    saveData: null as any,
  }))

  resumeState.value = {
    isResuming: false,
    saveKey: '',
    saveData: null,
  }

  console.debug('Starting new game - will initialize clean state')
  emit('start-game')
}

const deleteSave = () => {
  if (!lastSave.value) return

  if (confirm(t('game.confirmations.deleteSave'))) {
    const success = deleteSavedGame(lastSave.value.key)
    if (success) {
      savedGames.value = listSavedGames()
    }
  }
}

const formatSaveDate = (timestamp?: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
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
