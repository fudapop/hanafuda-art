import { useStorage } from '@vueuse/core'

const BGM = {
  main: '/audio/bgm/PerituneMaterial_Awayuki.ogg',
  koikoi1: '/audio/bgm/PerituneMaterial_EpicBattle_J_loop.ogg',
  koikoi2: '/audio/bgm/PerituneMaterial_Kengeki_loop.ogg',
} as const

const SFX = {
  card1: '/audio/sfx/card1.m4a',
  card2: '/audio/sfx/card2.m4a',
  coin: '/audio/sfx/coins-counting.m4a',
  slash: '/audio/sfx/sword-slash-and-swing-185432.mp3',
} as const

export const useAudio = () => {
  const audioRefA = ref<HTMLAudioElement>()
  const audioRefB = ref<HTMLAudioElement>()
  const isUsingA = ref(true)
  const isPlaying = ref(false)
  const audioContext = ref<AudioContext | null>(null)
  const hasUserInteracted = ref(false)

  // Load preferences from localStorage
  const systemPreferences = useStorage('hanafuda-system-preferences', {
    volume: 0.25,
    isMuted: false,
  })

  const currentVolume = ref(systemPreferences.value.volume)
  const isMuted = ref(systemPreferences.value.isMuted)

  // Helper to get the currently active audio element
  const currentAudioRef = computed(() => (isUsingA.value ? audioRefA : audioRefB))
  // Helper to get the inactive audio element
  const inactiveAudioRef = computed(() => (isUsingA.value ? audioRefB : audioRefA))

  // Initialize audio context for mobile compatibility
  const initAudioContext = () => {
    if (!import.meta.client) return false

    try {
      // Only create audio context if it doesn't exist
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // Resume audio context if suspended (required for iOS)
      if (audioContext.value.state === 'suspended') {
        return audioContext.value
          .resume()
          .then(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('AudioContext resumed successfully')
            }
            return true
          })
          .catch((error) => {
            console.warn('Failed to resume AudioContext:', error)
            return false
          })
      }

      return Promise.resolve(true)
    } catch (error) {
      console.warn('Audio context initialization failed:', error)
      return Promise.resolve(false)
    }
  }

  // Initialize audio element with mobile compatibility
  const initAudio = (src: string) => {
    if (!import.meta.client) return

    const ref = currentAudioRef.value
    ref.value = new Audio(src)
    ref.value.loop = true
    ref.value.preload = 'auto'
    ref.value.volume = isMuted.value ? 0 : currentVolume.value

    // Add mobile-specific attributes
    ref.value.setAttribute('playsinline', 'true')
    ref.value.setAttribute('webkit-playsinline', 'true')

    // Handle mobile audio loading
    ref.value.addEventListener('canplaythrough', () => {
      // Audio loaded successfully - no need to log this
    })

    ref.value.addEventListener('error', (e) => {
      console.error('Audio loading error:', e)
    })
  }

  // Enhanced play audio with mobile compatibility
  const playAudio = async (fadeDuration: number = 3) => {
    if (!currentAudioRef.value.value) return

    try {
      // Initialize audio context on first play
      if (!hasUserInteracted.value) {
        await initAudioContext()
        hasUserInteracted.value = true
      }

      currentAudioRef.value.value.volume = 0

      // For mobile, ensure audio context is resumed
      if (audioContext.value && audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }

      const playPromise = currentAudioRef.value.value.play()

      if (playPromise !== undefined) {
        await playPromise
        isPlaying.value = true
        fadeInAudio(fadeDuration)
      }
    } catch (error) {
      console.warn('Audio autoplay failed:', error)
      // For mobile, try to show a user-friendly message
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('Audio blocked by browser policy. User interaction required.')
      }
    }
  }

  // Pause audio (active only)
  const pauseAudio = () => {
    if (currentAudioRef.value.value) {
      currentAudioRef.value.value.pause()
      isPlaying.value = false
    }
  }

  // Stop audio with fade-out (active only)
  const stopAudio = (fadeDuration: number = 2) => {
    if (!currentAudioRef.value.value) return
    fadeOutAudio(fadeDuration)
  }

  // Fade in audio (active only)
  const fadeInAudio = (duration: number = 3) => {
    if (!currentAudioRef.value.value) return
    const startVolume = 0
    const targetVolume = isMuted.value ? 0 : currentVolume.value
    const startTime = Date.now()
    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const newVolume = startVolume + (targetVolume - startVolume) * easedProgress
      currentAudioRef.value.value!.volume = newVolume
      if (progress >= 1) {
        clearInterval(fadeInterval)
      }
    }, 50)
  }

  // Fade out audio (active only)
  const fadeOutAudio = (duration: number = 2) => {
    if (!currentAudioRef.value.value) return
    const startVolume = currentAudioRef.value.value.volume
    const targetVolume = 0
    const startTime = Date.now()
    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 2)
      const newVolume = startVolume + (targetVolume - startVolume) * easedProgress
      currentAudioRef.value.value!.volume = newVolume
      if (progress >= 1) {
        currentAudioRef.value.value!.pause()
        isPlaying.value = false
        clearInterval(fadeInterval)
      }
    }, 50)
  }

  // Set volume (both refs)
  const setVolume = (volume: number) => {
    currentVolume.value = Math.max(0, Math.min(1, volume))
    if (!isMuted.value) {
      if (audioRefA.value) audioRefA.value.volume = currentVolume.value
      if (audioRefB.value) audioRefB.value.volume = currentVolume.value
    }
  }

  // Toggle mute (both refs)
  const toggleMute = () => {
    isMuted.value = !isMuted.value
    if (audioRefA.value) audioRefA.value.volume = isMuted.value ? 0 : currentVolume.value
    if (audioRefB.value) audioRefB.value.volume = isMuted.value ? 0 : currentVolume.value
  }

  // Enhanced crossfade with mobile compatibility
  const crossfadeTo = async (src: string, duration: number = 3) => {
    if (!import.meta.client) return

    const fromRef = currentAudioRef.value
    // Return if the same track is already playing
    if (fromRef.value?.src?.includes(src)) return

    const toRef = inactiveAudioRef.value

    // Prepare new audio element with mobile attributes
    toRef.value = new Audio(src)
    toRef.value.loop = true
    toRef.value.preload = 'auto'
    toRef.value.volume = 0
    toRef.value.setAttribute('playsinline', 'true')
    toRef.value.setAttribute('webkit-playsinline', 'true')

    if (isMuted.value) toRef.value.volume = 0

    try {
      // Ensure audio context is active
      if (audioContext.value && audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }

      await toRef.value.play()
      isPlaying.value = true
    } catch (error) {
      console.warn('Audio crossfade failed:', error)
      return
    }

    // Start crossfade
    const startTime = Date.now()
    const fromStartVolume = fromRef.value?.volume ?? 0
    const toTargetVolume = isMuted.value ? 0 : currentVolume.value
    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)

      // Fade out old, fade in new
      if (fromRef.value) {
        const fromEased = 1 - Math.pow(1 - progress, 2)
        fromRef.value.volume = fromStartVolume * (1 - fromEased)
      }
      if (toRef.value) {
        const toEased = 1 - Math.pow(1 - progress, 3)
        toRef.value.volume = toTargetVolume * toEased
      }
      if (progress >= 1) {
        if (fromRef.value) {
          fromRef.value.pause()
          fromRef.value.src = ''
        }
        clearInterval(fadeInterval)
        isUsingA.value = !isUsingA.value // Swap active
      }
    }, 50)
  }

  // Enhanced setup autoplay with mobile-specific handling
  const setupAutoplay = (onInteraction?: () => void) => {
    if (!import.meta.client) return

    const handleUserInteraction = async () => {
      try {
        // Initialize audio context on first interaction
        await initAudioContext()
        hasUserInteracted.value = true

        if (onInteraction) {
          onInteraction()
        } else {
          await playAudio()
        }
      } catch (error) {
        console.warn('User interaction audio setup failed:', error)
      }

      // Remove listeners after successful interaction
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('touchend', handleUserInteraction)
    }

    // Add multiple event listeners for better mobile coverage
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)
    document.addEventListener('touchend', handleUserInteraction)
  }

  // Cleanup (both refs)
  const cleanup = () => {
    if (audioRefA.value) {
      audioRefA.value.pause()
      audioRefA.value.src = ''
      audioRefA.value = undefined
    }
    if (audioRefB.value) {
      audioRefB.value.pause()
      audioRefB.value.src = ''
      audioRefB.value = undefined
    }
    isPlaying.value = false
  }

  // Watch and save changes to localStorage
  watch(currentVolume, (newVolume) => {
    systemPreferences.value.volume = newVolume
  })

  watch(isMuted, (newMutedState) => {
    systemPreferences.value.isMuted = newMutedState
  })

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  // Enhanced SFX with mobile compatibility
  const playSfx = (src: string) => {
    if (!import.meta.client) return

    const sfx = new Audio(src)
    sfx.volume = isMuted.value ? 0 : currentVolume.value
    sfx.setAttribute('playsinline', 'true')
    sfx.setAttribute('webkit-playsinline', 'true')

    const playPromise = sfx.play()

    return new Promise<void>((resolve) => {
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            sfx.onended = () => resolve()
            sfx.onerror = () => resolve()
          })
          .catch((error) => {
            console.warn('SFX playback failed:', error)
            resolve()
          })
      } else {
        sfx.onended = () => resolve()
        sfx.onerror = () => resolve()
      }
    })
  }

  return {
    // Constants
    BGM,
    SFX,

    // State
    isPlaying: readonly(isPlaying),
    currentVolume: readonly(currentVolume),
    isMuted: readonly(isMuted),
    hasUserInteracted: readonly(hasUserInteracted),

    // Methods
    initAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    fadeInAudio,
    fadeOutAudio,
    setVolume,
    toggleMute,
    setupAutoplay,
    cleanup,
    crossfadeTo,
    playSfx,
    initAudioContext,
  }
}
