import { useStorage } from '@vueuse/core'

export const useAudio = () => {
  const audioRef = ref<HTMLAudioElement>()
  const isPlaying = ref(false)

  // Load preferences from localStorage
  const systemPreferences = useStorage('hanafuda-system-preferences', {
    volume: 0.5,
    isMuted: false,
  })

  const currentVolume = ref(systemPreferences.value.volume)
  const isMuted = ref(systemPreferences.value.isMuted)

  // Initialize audio element
  const initAudio = (src: string) => {
    if (import.meta.client) {
      audioRef.value = new Audio(src)
      audioRef.value.loop = true
      audioRef.value.preload = 'auto'

      // Use stored preferences
      audioRef.value.volume = isMuted.value ? 0 : currentVolume.value
    }
  }

  // Play audio with fade-in
  const playAudio = async (fadeDuration: number = 3) => {
    if (!audioRef.value) return

    try {
      // Start with volume 0
      audioRef.value.volume = 0
      await audioRef.value.play()
      isPlaying.value = true

      // Fade in
      fadeInAudio(fadeDuration)
    } catch (error) {
      console.warn('Audio autoplay failed:', error)
    }
  }

  // Pause audio
  const pauseAudio = () => {
    if (audioRef.value) {
      audioRef.value.pause()
      isPlaying.value = false
    }
  }

  // Stop audio with fade-out
  const stopAudio = (fadeDuration: number = 2) => {
    if (!audioRef.value) return
    fadeOutAudio(fadeDuration)
  }

  // Fade in audio
  const fadeInAudio = (duration: number = 3) => {
    if (!audioRef.value) return

    const startVolume = 0
    const targetVolume = isMuted.value ? 0 : currentVolume.value
    const startTime = Date.now()

    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)

      // Use easing function for smoother fade
      const easedProgress = 1 - Math.pow(1 - progress, 3) // Cubic ease-out

      const newVolume = startVolume + (targetVolume - startVolume) * easedProgress
      audioRef.value!.volume = newVolume

      if (progress >= 1) {
        clearInterval(fadeInterval)
      }
    }, 50) // Update every 50ms for smooth fade
  }

  // Fade out audio
  const fadeOutAudio = (duration: number = 2) => {
    if (!audioRef.value) return

    const startVolume = audioRef.value.volume
    const targetVolume = 0
    const startTime = Date.now()

    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)

      const easedProgress = 1 - Math.pow(1 - progress, 2) // Quadratic ease-out

      const newVolume = startVolume + (targetVolume - startVolume) * easedProgress
      audioRef.value!.volume = newVolume

      if (progress >= 1) {
        audioRef.value!.pause()
        isPlaying.value = false
        clearInterval(fadeInterval)
      }
    }, 50)
  }

  // Set volume
  const setVolume = (volume: number) => {
    if (!audioRef.value) return

    currentVolume.value = Math.max(0, Math.min(1, volume))
    if (!isMuted.value) {
      audioRef.value.volume = currentVolume.value
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.value) return

    isMuted.value = !isMuted.value
    audioRef.value.volume = isMuted.value ? 0 : currentVolume.value
  }

  // Handle user interaction for autoplay
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

  // Cleanup
  const cleanup = () => {
    if (audioRef.value) {
      audioRef.value.pause()
      audioRef.value.src = ''
      audioRef.value = undefined
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
  }
}
