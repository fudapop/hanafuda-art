<template>
  <div class="fixed z-10 top-4 right-4">
    <!-- Settings Tab Button -->
    <button
      ref="triggerRef"
      @click="toggleExpanded"
      :class="[
        'game-ui-btn',
        isExpanded && 'rounded-b-none border-b-0',
        !isExpanded && gameIsStarted && 'opacity-50 hover:opacity-100',
      ]"
      :title="t('common.labels.settings')"
    >
      <Icon
        name="ic:round-settings"
        class="w-5 h-5 text-white transition-transform duration-300"
        :class="{ 'rotate-90': isExpanded }"
      />
      <span class="text-sm font-medium text-white sr-only">{{ t('common.labels.settings') }}</span>
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
          'bg-black/30 dark:bg-white/10 backdrop-blur-sm border border-white/20',
          'group shadow-lg min-w-[200px]',
          'absolute right-0',
        ]"
      >
        <!-- Color Mode Toggle -->
        <div class="mb-3">
          <label class="block mb-2 text-xs font-medium text-white sr-only">{{
            t('common.labels.theme')
          }}</label>
          <button
            @click="handleColorModeClick"
            :class="[
              'flex items-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-200',
              'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
              'text-white hover:text-yellow-300',
            ]"
            :title="t('settings.actions.toggleColorMode')"
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
            <span class="text-sm capitalize">{{ t(`settings.colorMode.${colorModeState}`) }}</span>
          </button>
        </div>

        <!-- Fullscreen Toggle -->
        <!-- Installed PWA on mobile should already be fullscreen -->
        <div
          class="mb-3"
          v-if="isSupported"
        >
          <label class="block mb-2 text-xs font-medium text-white sr-only">{{
            t('common.labels.fullscreen')
          }}</label>
          <button
            @click="toggle"
            :class="[
              'flex items-center gap-2 w-full px-3 py-2 rounded-md transition-all duration-200',
              'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
              'text-white hover:text-yellow-300',
            ]"
            :title="t('settings.actions.toggleFullscreen')"
          >
            <Icon
              v-if="isFullscreen"
              name="ic:outline-fullscreen-exit"
              class="w-4 h-4"
            />
            <Icon
              v-else
              name="ic:outline-fullscreen"
              class="w-4 h-4"
            />
            <span class="text-sm capitalize">{{
              isFullscreen ? t('common.labels.exitFullscreen') : t('common.labels.fullscreen')
            }}</span>
          </button>
        </div>

        <!-- Language Switcher -->
        <div class="relative mb-3">
          <label class="block mb-2 text-xs font-medium text-white sr-only">{{
            t('common.labels.language')
          }}</label>
          <div class="relative peer">
            <select
              :disabled="gameIsStarted"
              :value="locale"
              @change="handleLocaleChange"
              :class="[
                'w-full px-3 py-2 pl-8 rounded-md transition-all duration-200 appearance-none',
                'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
                'text-white text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:outline-none focus-visible:border-white focus-visible:ring-inset focus-visible:ring-primary',
              ]"
              :title="t('settings.actions.selectLanguage')"
            >
              <option
                v-for="availableLocale in locales"
                :key="availableLocale.code"
                :value="availableLocale.code"
                :class="['bg-black/90 dark:bg-white/90 text-white dark:text-black']"
              >
                {{ availableLocale.name }}
              </option>
            </select>
            <Icon
              name="ic:round-language"
              class="absolute w-4 h-4 transform -translate-y-1/2 pointer-events-none left-2 top-1/2 text-white/70"
            />
          </div>
          <div
            class="absolute z-10 items-center hidden p-2 mb-1 text-xs bg-black rounded-md peer-hover:flex bottom-full text-white/70"
            v-if="gameIsStarted"
          >
            <Icon
              name="ic:round-info"
              class="flex-shrink-0 inline w-4 h-4 mr-1"
            />
            <p>{{ t('settings.notices.languageChangeNotice') }}</p>
          </div>
        </div>

        <!-- Audio Controls -->
        <div class="space-y-4">
          <!-- BGM Controls -->
          <div>
            <label class="block mb-2 text-xs font-medium text-white/80">{{
              t('settings.audio.bgm')
            }}</label>

            <div class="flex items-center gap-2">
              <button
                @click="toggleBgmMuteHandler"
                :class="[
                  'flex items-center justify-center p-2 rounded-md transition-all duration-200',
                  'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
                  'text-white hover:text-yellow-300',
                ]"
                :title="
                  bgmDisabled ? t('settings.actions.enableBgm') : t('settings.actions.disableBgm')
                "
              >
                <Icon
                  :name="bgmDisabled ? 'ic:round-volume-off' : 'ic:round-volume-up'"
                  class="w-4 h-4"
                />
              </button>

              <div class="flex-1">
                <input
                  type="range"
                  :value="bgmVolume * 100"
                  @input="handleBgmVolumeChange"
                  :disabled="bgmDisabled"
                  min="0"
                  max="100"
                  step="5"
                  :class="[
                    'w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer',
                    'slider-thumb:appearance-none slider-thumb:h-3 slider-thumb:w-3',
                    'slider-thumb:rounded-full slider-thumb:bg-white slider-thumb:cursor-pointer',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ]"
                  :title="t('settings.audio.bgmVolume')"
                />
              </div>
            </div>

            <!-- Current Track Display -->
            <div
              v-if="currentTrackName"
              class="px-3 py-2 mt-2 overflow-hidden border rounded-md bg-black/5 dark:bg-white/5 border-white/10"
            >
              <div class="flex items-center gap-2">
                <Icon
                  name="ic:round-music-note"
                  class="flex-shrink-0 w-3 h-3 text-white/70"
                />
                <div class="overflow-hidden">
                  <span
                    class="text-xs text-white/80 whitespace-nowrap"
                    :class="{ 'track-scroll': shouldScroll }"
                  >
                    {{ currentTrackName }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- SFX Controls -->
          <div>
            <label class="block mb-2 text-xs font-medium text-white/80">{{
              t('settings.audio.sfx')
            }}</label>

            <div class="flex items-center gap-2">
              <button
                @click="toggleSfxMuteHandler"
                :class="[
                  'flex items-center justify-center p-2 rounded-md transition-all duration-200',
                  'bg-black/10 dark:bg-white/10 hover:bg-white/15 border border-white/20',
                  'text-white hover:text-yellow-300',
                ]"
                :title="
                  sfxDisabled ? t('settings.actions.enableSfx') : t('settings.actions.disableSfx')
                "
              >
                <Icon
                  :name="sfxDisabled ? 'ic:round-volume-off' : 'ic:round-volume-up'"
                  class="w-4 h-4"
                />
              </button>

              <div class="flex-1">
                <input
                  type="range"
                  :value="sfxVolume * 100"
                  @input="handleSfxVolumeChange"
                  :disabled="sfxDisabled"
                  min="0"
                  max="100"
                  step="5"
                  :class="[
                    'w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer',
                    'slider-thumb:appearance-none slider-thumb:h-3 slider-thumb:w-3',
                    'slider-thumb:rounded-full slider-thumb:bg-white slider-thumb:cursor-pointer',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ]"
                  :title="t('settings.audio.sfxVolume')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useColorMode, useCycleList, useFullscreen, useStorage } from '@vueuse/core'
import { useAudio } from '~/composables/useAudio'

type ColorMode = 'auto' | 'dark' | 'light'

const { locale, locales, setLocale, t } = useI18n()

const handleLocaleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const selectedLocale = target.value as typeof locale.value
  setLocale(selectedLocale)
}

const { isFullscreen, toggle, enter, isSupported } = useFullscreen(undefined, {
  autoExit: true,
})

// Gamestate
const gameIsStarted = useState('start', () => false)

// Settings panel state
const isExpanded = ref(false)
const panelRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

onClickOutside(panelRef, (e) => {
  if (triggerRef.value && triggerRef.value.contains(e.target as Node)) {
    return
  }
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
  const newMode = colorModeState.value
  mode.value = newMode
  systemPreferences.value.colorMode = newMode

  // Dispatch custom event for plugin to sync immediately
  if (process.client) {
    window.dispatchEvent(new CustomEvent('color-mode-change'))

    // Also apply directly to HTML element for immediate effect in PWA
    const html = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (newMode === 'dark' || (newMode === 'auto' && prefersDark)) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
})

// Watch for fullscreen changes and save to localStorage
watchEffect(() => {
  systemPreferences.value.fullscreen = isFullscreen.value
})

// Audio functionality - use the global audio instance from app.vue
const audio = useNuxtApp().$audio as ReturnType<typeof useAudio>

if (!audio) {
  throw new Error('Audio instance not found. Make sure it is provided in app.vue')
}

const {
  isPlaying,
  playAudio,
  pauseAudio,
  currentTrackName,

  // BGM controls
  bgmVolume,
  bgmDisabled,
  setBgmVolume,
  toggleBgmDisabled,

  // SFX controls
  sfxVolume,
  sfxDisabled,
  setSfxVolume,
  toggleSfxDisabled,

  // Legacy aliases for backward compatibility
  currentVolume,
  isMuted,
  setVolume,
  toggleMute: audioToggleMute,
} = audio

// No need for trackNames mapping or currentTrackName computed here!

// Determine if text should scroll (if it's longer than container)
const shouldScroll = computed(() => {
  if (!currentTrackName.value) return false

  // You can adjust this threshold based on your container width
  return currentTrackName.value.length > 20
})

onMounted(() => {
  if (!isSupported.value) {
    console.warn(t('errors.browser.fullscreenNotSupported'))
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

// Handle BGM volume change
const handleBgmVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const volume = parseInt(target.value) / 100
  setBgmVolume(volume)
}

// Handle SFX volume change
const handleSfxVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const volume = parseInt(target.value) / 100
  setSfxVolume(volume)
}

// Toggle BGM disabled (using mute button UI)
const toggleBgmMuteHandler = () => {
  toggleBgmDisabled()
}

// Toggle SFX disabled (using mute button UI)
const toggleSfxMuteHandler = () => {
  toggleSfxDisabled()
}

// Legacy handlers for backward compatibility
const handleVolumeChange = handleBgmVolumeChange
const toggleMute = toggleBgmMuteHandler
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

/* Track scrolling animation */
.track-scroll:hover {
  animation: track-scroll 8s linear infinite;
  display: inline-block;
}

@keyframes track-scroll {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(calc(-100% + 100px));
  }
  100% {
    transform: translateX(0);
  }
}

/* Pause animation on hover */
/* .track-scroll:hover {
  animation-play-state: paused;
} */
</style>
