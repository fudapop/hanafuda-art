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

      <div class="flex flex-col items-center gap-6 sm:gap-8 mt-12">
        <!-- Single Player Section -->
        <div class="flex flex-col items-center gap-3">
          <h2 class="text-sm font-semibold tracking-wide uppercase text-text-secondary">
            {{ t('game.modes.singlePlayer') }}
          </h2>

          <!-- Resume Single Player Button -->
          <div
            v-if="hasSinglePlayerSave"
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
              ]"
              @click="resumeSinglePlayerGame"
              :disabled="isLoading"
            >
              {{ isLoading ? t('common.actions.loading') : t('game.actions.resumeGame') }}
            </button>

            <!-- Save Info -->
            <div class="flex flex-col items-center gap-2 mt-3">
              <div class="text-xs text-text-secondary">
                {{ t('game.saveInfo.lastSaved') }}:
                {{ formatSaveDate(singlePlayerSave?.timestamp) }}
              </div>
              <button
                class="px-3 py-1 text-xs font-medium text-red-500 transition-colors duration-300 border border-red-300 rounded-xs hover:bg-red-50 hover:border-red-400 dark:hover:bg-red-950/30"
                @click="deleteSinglePlayerSave"
                :title="t('game.actions.deleteSave')"
              >
                {{ t('common.actions.delete') }}
              </button>
            </div>
          </div>

          <!-- New Single Player Button -->
          <button
            v-else
            :class="[
              'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
              'bg-linear-to-b from-amber-100 to-amber-200 dark:from-amber-200 dark:to-amber-300',
              'text-[#23221c] font-bold text-lg',
              'hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-300 dark:hover:to-amber-400',
              'active:from-amber-300 active:to-amber-400',
              'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
            ]"
            @click="startNewSinglePlayerGame"
            :disabled="isLoading"
          >
            {{ t('common.actions.playNow') }}
          </button>
        </div>

        <!-- Multiplayer Section -->
        <div
          v-if="!isGuest"
          class="flex flex-col items-center gap-3"
        >
          <h2 class="text-sm font-semibold tracking-wide uppercase text-text-secondary">
            {{ t('game.modes.multiplayer') }}
          </h2>

          <!-- Resume Multiplayer Button -->
          <div
            v-if="hasMultiplayerSave"
            class="flex flex-col items-center"
          >
            <button
              :class="[
                'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
                'bg-linear-to-b from-blue-100 to-blue-200 dark:from-blue-200 dark:to-blue-300',
                'text-[#23221c] font-bold text-lg',
                'hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-300 dark:hover:to-blue-400',
                'active:from-blue-300 active:to-blue-400',
                'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
              ]"
              @click="resumeMultiplayerGame"
              :disabled="isLoading"
            >
              {{ isLoading ? t('common.actions.loading') : t('game.actions.resumeMatch') }}
            </button>

            <!-- Save Info -->
            <div class="flex flex-col items-center gap-2 mt-3">
              <div class="text-xs text-text-secondary">
                {{ t('game.saveInfo.lastSaved') }}: {{ formatSaveDate(multiplayerSave?.timestamp) }}
              </div>
              <button
                class="px-3 py-1 text-xs font-medium text-red-500 transition-colors duration-300 border border-red-300 rounded-xs hover:bg-red-50 hover:border-red-400 dark:hover:bg-red-950/30"
                @click="deleteMultiplayerSave"
                :title="t('game.actions.deleteSave')"
              >
                {{ t('common.actions.delete') }}
              </button>
            </div>
          </div>

          <!-- New Multiplayer Button -->
          <button
            v-else
            :class="[
              'play-now-button rounded-xs border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 min-w-[120px] sm:min-w-[150px] h-[50px] sm:h-[55px] p-3',
              'bg-linear-to-b from-purple-100 to-purple-200 dark:from-purple-200 dark:to-purple-300',
              'text-[#23221c] font-bold text-lg',
              'hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-300 dark:hover:to-purple-400',
              'active:from-purple-300 active:to-purple-400',
              'ring-1 ring-inset ring-offset-2 ring-[#23221c]/30 ring-offset-border/20',
              'opacity-50 cursor-not-allowed',
            ]"
            @click="startNewMultiplayerGame"
            disabled
            :title="t('game.messages.comingSoon')"
          >
            {{ t('game.actions.newMatch') }}
          </button>
          <div class="text-xs italic text-text-secondary/70">
            {{ t('game.messages.comingSoon') }}
          </div>
        </div>

        <div class="flex flex-col gap-1">
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
const { listSavedGames, deleteSavedGame, loadGameFromStorage } = useStoreManager()
const isLoading = ref(false)

// Check for saved games (separate single-player and multiplayer)
const savedGames = ref<
  Array<{
    key: string
    timestamp: number
    gameId: string
    mode: 'single' | 'multiplayer'
    p1?: string | null
    p2?: string | null
    activePlayer?: string | null
  }>
>([])

// Separate saves by mode
const singlePlayerSave = computed(() => savedGames.value.find((s) => s.mode === 'single') || null)
const multiplayerSave = computed(
  () => savedGames.value.find((s) => s.mode === 'multiplayer') || null,
)

const hasSinglePlayerSave = computed(() => singlePlayerSave.value !== null)
const hasMultiplayerSave = computed(() => multiplayerSave.value !== null)

// For backward compatibility
const hasSavedGame = computed(() => savedGames.value.length > 0)
const lastSave = computed(() => savedGames.value[0] || null)

// Check for saved games on mount only
onMounted(async () => {
  savedGames.value = await listSavedGames()
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
const resumeSinglePlayerGame = async () => {
  if (!singlePlayerSave.value) return

  isLoading.value = true
  try {
    // Set global state to indicate we're resuming from save
    const resumeState = useState('resume-save', () => ({
      isResuming: false,
      saveKey: '',
      saveData: null as any,
      mode: 'single' as 'single' | 'multiplayer',
    }))

    // Load the save data from IndexedDB
    const success = await loadGameFromStorage(singlePlayerSave.value.key)
    if (success) {
      // Store the save key and mode for later deletion after resume
      resumeState.value = {
        isResuming: true,
        saveKey: singlePlayerSave.value.key,
        saveData: null, // Data already loaded into stores
        mode: 'single',
      }

      // Start the game - it will handle the deferred loading
      emit('start-game')
    } else {
      console.error('Failed to load saved game data')
    }
  } catch (error) {
    console.error('Error preparing resume:', error)
  } finally {
    isLoading.value = false
  }
}

const resumeMultiplayerGame = async () => {
  if (!multiplayerSave.value) return

  isLoading.value = true
  try {
    // Set global state to indicate we're resuming from save
    const resumeState = useState('resume-save', () => ({
      isResuming: false,
      saveKey: '',
      saveData: null as any,
      mode: 'single' as 'single' | 'multiplayer',
    }))

    // Load the save data from IndexedDB
    const success = await loadGameFromStorage(multiplayerSave.value.key)
    if (success) {
      // Store the save key and mode (multiplayer saves persist)
      resumeState.value = {
        isResuming: true,
        saveKey: multiplayerSave.value.key,
        saveData: null, // Data already loaded into stores
        mode: 'multiplayer',
      }

      // Start the game - it will handle the deferred loading
      emit('start-game')
    } else {
      console.error('Failed to load saved game data')
    }
  } catch (error) {
    console.error('Error preparing resume:', error)
  } finally {
    isLoading.value = false
  }
}

const startNewSinglePlayerGame = async () => {
  // Clear any existing single-player save when starting new game
  if (hasSinglePlayerSave.value && singlePlayerSave.value) {
    await deleteSavedGame(singlePlayerSave.value.key)
    savedGames.value = await listSavedGames()
  }

  // Clear resume state to ensure normal game initialization
  const resumeState = useState('resume-save', () => ({
    isResuming: false,
    saveKey: '',
    saveData: null as any,
    mode: 'single' as 'single' | 'multiplayer',
  }))

  resumeState.value = {
    isResuming: false,
    saveKey: '',
    saveData: null,
    mode: 'single',
  }

  console.debug('Starting new single-player game - will initialize clean state')
  emit('start-game')
}

const startNewMultiplayerGame = async () => {
  // TODO: Implement multiplayer matchmaking/setup
  console.warn('Multiplayer matchmaking not yet implemented')
}

const deleteSinglePlayerSave = async () => {
  if (!singlePlayerSave.value) return

  if (confirm(t('game.confirmations.deleteSave'))) {
    const success = await deleteSavedGame(singlePlayerSave.value.key)
    if (success) {
      savedGames.value = await listSavedGames()
    }
  }
}

const deleteMultiplayerSave = async () => {
  if (!multiplayerSave.value) return

  if (confirm(t('game.confirmations.deleteSave'))) {
    const success = await deleteSavedGame(multiplayerSave.value.key)
    if (success) {
      savedGames.value = await listSavedGames()
    }
  }
}

// Backward compatibility handlers
const resumeGame = resumeSinglePlayerGame
const startNewGame = startNewSinglePlayerGame
const deleteSave = deleteSinglePlayerSave

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
