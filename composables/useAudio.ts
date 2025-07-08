import { useStorage } from '@vueuse/core'

export const useAudio = () => {
  const audioRefA = ref<HTMLAudioElement>()
  const audioRefB = ref<HTMLAudioElement>()
  const isUsingA = ref(true)
  const isPlaying = ref(false)

  // Load preferences from localStorage
  const systemPreferences = useStorage('hanafuda-system-preferences', {
    volume: 0.5,
    isMuted: false,
  })

  const currentVolume = ref(systemPreferences.value.volume)
  const isMuted = ref(systemPreferences.value.isMuted)

  // Helper to get the currently active audio element
  const currentAudioRef = computed(() => (isUsingA.value ? audioRefA : audioRefB))
  // Helper to get the inactive audio element
  const inactiveAudioRef = computed(() => (isUsingA.value ? audioRefB : audioRefA))

  // Initialize audio element (for backward compatibility, always uses the active ref)
  const initAudio = (src: string) => {
    if (import.meta.client) {
      const ref = currentAudioRef.value
      ref.value = new Audio(src)
      ref.value.loop = true
      ref.value.preload = 'auto'
      ref.value.volume = isMuted.value ? 0 : currentVolume.value
    }
  }

  // Play audio with fade-in (uses the active ref)
  const playAudio = async (fadeDuration: number = 3) => {
    if (!currentAudioRef.value.value) return
    try {
      currentAudioRef.value.value.volume = 0
      await currentAudioRef.value.value.play()
      isPlaying.value = true
      fadeInAudio(fadeDuration)
    } catch (error) {
      console.warn('Audio autoplay failed:', error)
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

  // Crossfade to a new track
  const crossfadeTo = async (src: string, duration: number = 3) => {
    if (!import.meta.client) return
    const fromRef = currentAudioRef.value
    // Return if the same track is already playing
    if (fromRef.value?.src?.includes(src)) return
    const toRef = inactiveAudioRef.value
    // Prepare new audio element
    toRef.value = new Audio(src)
    toRef.value.loop = true
    toRef.value.preload = 'auto'
    toRef.value.volume = 0
    if (isMuted.value) toRef.value.volume = 0
    try {
      await toRef.value.play()
    } catch (error) {
      console.warn('Audio autoplay failed:', error)
      return
    }
    isPlaying.value = true
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

  // Handle user interaction for autoplay (active only)
  const setupAutoplay = (onInteraction?: () => void) => {
    if (!import.meta.client) return
    const handleUserInteraction = () => {
      if (onInteraction) {
        onInteraction()
      } else {
        playAudio()
      }
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)
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

  const playSfx = (src: string) => {
    if (!import.meta.client) return
    const sfx = new Audio(src)
    sfx.volume = isMuted.value ? 0 : currentVolume.value
    sfx.play()
    return new Promise<void>((resolve) => {
      sfx.onended = () => resolve()
      sfx.onerror = () => resolve()
    })
  }

  return {
    // State
    isPlaying: readonly(isPlaying),
    currentVolume: readonly(currentVolume),
    isMuted: readonly(isMuted),

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
    crossfadeTo, // new method
    playSfx,
  }
}
