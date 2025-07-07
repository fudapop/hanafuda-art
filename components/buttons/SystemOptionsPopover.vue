<template>
  <div class="fixed z-10 top-4 right-4">
    <!-- Settings Tab Button -->
    <button
      @click="toggleExpanded"
      :class="[
        'game-ui-btn',
        isExpanded && 'rounded-b-none border-b-0',
        !isExpanded && gameIsStarted && 'opacity-30 hover:opacity-100',
      ]"
      title="Settings"
    >
      <Icon
        name="ic:round-settings"
        class="w-5 h-5 text-white transition-transform duration-300"
        :class="{ 'rotate-90': isExpanded }"
      />
      <span class="text-sm font-medium text-white sr-only">Settings</span>
    </button>

    <!-- Settings Panel -->
    <Transition
      name="slide-down"
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-300 ease-in"
      enter-from-class="transform scale-95 -translate-y-2 opacity-0"
      enter-to-class="transform scale-100 translate-y-0 opacity-100"
      leave-from-class="transform scale-100 translate-y-0 opacity-100"
      leave-to-class="transform scale-95 -translate-y-2 opacity-0"
    >
      <div
        v-show="isExpanded"
        ref="panelRef"
        :class="[
          'mt-0 p-4 rounded-lg rounded-tr-none',
          'bg-black/20 dark:bg-white/10 backdrop-blur-sm border border-white/20',
          'group shadow-lg min-w-[200px]',
          'absolute right-0',
        ]"
      >
        <!-- Color Mode Toggle -->
        <div class="mb-3">
          <label class="block mb-2 text-xs font-medium text-white sr-only">Theme</label>
          <button
            @click="handleColorModeClick"
            :class="[
              'flex items-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-200',
              'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
              'text-white hover:text-yellow-300',
            ]"
            title="Toggle Color Mode"
          >
            <Icon
              v-if="colorModeState === 'dark'"
              name="ic:outline-dark-mode"
              class="w-4 h-4"
            />
            <Icon
              v-else-if="colorModeState === 'light'"
              name="ic:outline-light-mode"
              class="w-4 h-4"
            />
            <Icon
              v-else
              name="ic:round-monitor"
              class="w-4 h-4"
            />
            <span class="text-sm capitalize">{{ colorModeState }}</span>
          </button>
        </div>

        <!-- Fullscreen Toggle -->
        <div
          class="mb-3"
          v-if="isSupported"
        >
          <label class="block mb-2 text-xs font-medium text-white sr-only">Fullscreen</label>
          <button
            @click="toggle"
            :class="[
              'flex items-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-200',
              'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
              'text-white hover:text-yellow-300',
            ]"
            title="Toggle Fullscreen"
          >
            <Icon
              v-if="isFullscreen"
              name="ic:outline-fullscreen"
              class="w-4 h-4"
            />
            <Icon
              v-else
              name="ic:outline-fullscreen-exit"
              class="w-4 h-4"
            />
            <span class="text-sm capitalize">{{
              isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'
            }}</span>
          </button>
        </div>

        <!-- Music Controls -->
        <div>
          <label class="block mb-2 text-xs font-medium text-white sr-only">Music</label>

          <!-- Play/Pause Button -->
          <!-- <button
            @click="toggleMusic"
            :class="[
              'flex items-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-200 mb-2',
              'bg-white/10 hover:bg-white/20 border border-white/20',
              'text-white hover:text-green-300',
            ]"
            title="Toggle Music"
          >
            <Icon
              :name="isPlaying ? 'ic:round-pause' : 'ic:round-play-arrow'"
              class="w-4 h-4"
            />
            <span class="text-sm">{{ isPlaying ? 'Pause' : 'Play' }}</span>
          </button> -->

          <!-- Volume Controls -->
          <div class="flex items-center gap-2">
            <button
              @click="toggleMute"
              :class="[
                'flex items-center justify-center p-2 rounded-md transition-all duration-200',
                'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
                'text-white hover:text-yellow-300',
              ]"
              title="Toggle Mute"
            >
              <Icon
                :name="isMuted ? 'ic:round-volume-off' : 'ic:round-volume-up'"
                class="w-4 h-4"
              />
            </button>

            <div class="flex-1">
              <input
                type="range"
                :value="currentVolume * 100"
                @input="handleVolumeChange"
                :disabled="isMuted"
                min="0"
                max="100"
                step="5"
                :class="[
                  'w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer',
                  'slider-thumb:appearance-none slider-thumb:h-3 slider-thumb:w-3',
                  'slider-thumb:rounded-full slider-thumb:bg-white slider-thumb:cursor-pointer',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                ]"
                title="Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useColorMode, useCycleList, useFullscreen, useStorage } from '@vueuse/core'
import { inject } from 'vue'
import { useAudio } from '~/composables/useAudio'

type ColorMode = 'auto' | 'dark' | 'light'

const { isFullscreen, toggle, enter, exit, isSupported } = useFullscreen(undefined, {
  autoExit: true,
})

// Gamestate
const gameIsStarted = useState('start', () => false)

// Settings panel state
const isExpanded = ref(false)
const panelRef = ref<HTMLDivElement | null>(null)

onClickOutside(panelRef, () => {
  isExpanded.value = false
})

// System preferences stored in localStorage
const systemPreferences = useStorage('hanafuda-system-preferences', {
  colorMode: 'auto' as ColorMode,
  fullscreen: false,
})

// Color mode functionality
const mode = useColorMode({
  emitAuto: true,
})

const { state: colorModeState, next: nextColorMode } = useCycleList<ColorMode>(
  ['dark', 'light', 'auto'],
  {
    initialValue: systemPreferences.value.colorMode,
  },
)

const handleColorModeClick = () => {
  nextColorMode()
}

// Watch for color mode changes and save to localStorage
watchEffect(() => {
  mode.value = colorModeState.value
  systemPreferences.value.colorMode = colorModeState.value
})

// Watch for fullscreen changes and save to localStorage
watchEffect(() => {
  systemPreferences.value.fullscreen = isFullscreen.value
})

// Audio functionality - use the global audio instance from app.vue
const audio = inject('audio') as ReturnType<typeof useAudio>

if (!audio) {
  throw new Error('Audio instance not found. Make sure it is provided in app.vue')
}

const {
  isPlaying,
  currentVolume,
  isMuted,
  playAudio,
  pauseAudio,
  setVolume,
  toggleMute: audioToggleMute,
} = audio

onMounted(() => {
  if (!isSupported.value) {
    console.warn('Fullscreen is not supported in this browser.')
  } else {
    if (systemPreferences.value.fullscreen) {
      enter()
    }
  }
})

// Toggle expanded state
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// Toggle music play/pause
const toggleMusic = () => {
  if (isPlaying.value) {
    pauseAudio()
  } else {
    playAudio()
  }
}

// Handle volume change
const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const volume = parseInt(target.value) / 100
  setVolume(volume)
}

// Toggle mute
const toggleMute = () => {
  audioToggleMute()
}
</script>

<style scoped>
/* Custom slider styling */
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type='range']::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Hover effects */
input[type='range']:hover::-webkit-slider-thumb {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

input[type='range']:hover::-moz-range-thumb {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
</style>
