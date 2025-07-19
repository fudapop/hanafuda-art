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
        src="~/assets/images/bg-landing.png"
        class="absolute z-5 object-cover w-full h-full dark:invert animate-ping [animation-duration:10s] motion-reduce:animate-none"
      />
      <img
        src="~/assets/images/bg-landing.png"
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
          src="~/assets/images/flowers-landing1.png"
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
          src="~/assets/images/flowers-landing2.png"
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
        src="~/assets/images/logo-title.png"
        :class="['w-[120px] mb-2', isMobile ? 'landscape:w-[30dvh]' : 'sm:w-[180px]']"
        alt="Hanafuda Koi-Koi"
      />
      <h1 class="sr-only">Hanafuda Koi-Koi</h1>
      <div class="flex flex-col items-center gap-4">
        <!-- Resume Game Button (shown when save exists) -->
        <div v-if="hasSave" class="flex flex-col items-center gap-2">
          <button
            :class="[
              'rounded-sm overflow-hidden mt-12 border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 w-[150px]',
              isMobile ? 'landscape:mt-0' : 'sm:mt-24',
            ]"
            @click="handleResumeGame"
          >
            <img
              src="~/assets/images/button-play-now.png"
              class="w-full h-full cover"
            />
            <span class="sr-only"> RESUME GAME </span>
          </button>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">RESUME GAME</span>
        </div>

        <!-- Play Now Button -->
        <div class="flex flex-col items-center gap-2">
          <button
            :class="[
              'rounded-sm overflow-hidden',
              hasSave ? 'mt-2' : 'mt-12',
              'border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 w-[150px]',
              isMobile ? (hasSave ? '' : 'landscape:mt-0') : (hasSave ? '' : 'sm:mt-24'),
            ]"
            @click="handlePlayNow"
          >
            <img
              src="~/assets/images/button-play-now.png"
              class="w-full h-full cover"
            />
            <span class="sr-only"> PLAY NOW </span>
          </button>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ hasSave ? 'NEW GAME' : 'PLAY NOW' }}
          </span>
        </div>
        
        <!-- Save info text -->
        <p v-if="hasSave && currentSave" class="text-xs text-gray-500 text-center">
          Saved game: Round {{ currentSave.preview.round }}, Turn {{ currentSave.preview.turn }}
        </p>

        <!-- Options Button - Only show when logged in -->
        <button
          v-if="!userIsGuest"
          class="mt-2 ring-inset action-button"
          @click="() => openOptions()"
        >
          OPTIONS
        </button>

        <!-- Authentication buttons -->
        <div class="flex gap-4">
          <button
            v-if="userIsGuest"
            class="action-button"
            @click="goToLogin"
          >
            SIGN UP
          </button>
        </div>
        <span
          v-if="userIsGuest"
          role="link"
          @click="handleSignin"
          class="block text-sm text-center transition-colors duration-200 cursor-pointer text-text-secondary hover:underline hover:text-primary"
        >
          Sign in to an existing account &rarr;
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
const testPlay = useState('test', () => false)
const gameStart = useState('gameStart')
const { userIsGuest, logout } = useAuth()
const { isMobile } = useDevice()
const { openOptions } = useOptionsPanel()

// Game persistence
const { 
  hasCurrentProfileSave, 
  getCurrentProfileSave, 
  deleteCurrentProfileSave,
  loadCurrentProfileGame,
  isSupported 
} = useGamePersistence()

// Reactive state for saves
const hasSave = ref(false)
const currentSave = ref(null)

// Check for existing save on mount and profile changes
const checkForSave = async () => {
  if (!isSupported.value) {
    hasSave.value = false
    return
  }
  
  try {
    hasSave.value = await hasCurrentProfileSave()
    if (hasSave.value) {
      currentSave.value = await getCurrentProfileSave()
    }
  } catch (error) {
    console.warn('Failed to check for saves:', error)
    hasSave.value = false
  }
}

const handleResumeGame = async () => {
  try {
    await loadCurrentProfileGame()
    emit('start-game')
  } catch (error) {
    console.error('Failed to load saved game:', error)
    // Could show error message here
    alert('Failed to load saved game. Please try again.')
  }
}

const handlePlayNow = async () => {
  if (hasSave.value) {
    // Warn user about discarding save
    const shouldDiscard = confirm(
      'You have a saved game. Starting a new game will discard your saved progress. Continue?'
    )
    
    if (!shouldDiscard) {
      return
    }
    
    // Delete the save
    try {
      await deleteCurrentProfileSave()
      hasSave.value = false
      currentSave.value = null
    } catch (error) {
      console.error('Failed to delete save:', error)
      // Continue anyway
    }
  }
  
  emit('start-game')
}

const testGame = () => {
  testPlay.value = true
  emit('start-game')
}

const goToLogin = () => {
  navigateTo({ path: '/sign-in', query: { signup: 'true' } })
}

const handleSignin = () => {
  logout()
  navigateTo({ path: '/sign-in', query: { exit: 'true' } })
}

// Watch for game start/end to refresh save state
watch(gameStart, () => {
  if (!gameStart.value) {
    testPlay.value = false
    // Refresh save state when returning to start screen
    checkForSave()
  }
})

// Check for saves on mount
onMounted(() => {
  checkForSave()
})

// Watch for profile changes to refresh save state
const { current: currentProfile } = useProfile()
watch(currentProfile, () => {
  checkForSave()
}, { immediate: true })
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
