import { useStorage } from '@vueuse/core'

export const useAudio = () => {
  const config = useRuntimeConfig()

  const bucketUrl = `${config.public.supabaseUrl}/storage/v1/object/public/static/audio`

  const BGM = {
    main: `${bucketUrl}/bgm/PerituneMaterial_Awayuki.ogg`,
    koikoi1: `${bucketUrl}/bgm/PerituneMaterial_EpicBattle_J_loop.ogg`,
    koikoi2: `${bucketUrl}/bgm/PerituneMaterial_Kengeki_loop.ogg`,
  } as const

  // Add track names mapping internally
  const trackNames = {
    [BGM.main]: 'Awayuki - Peritune',
    [BGM.koikoi1]: 'Epic Battle J - Peritune',
    [BGM.koikoi2]: 'Kengeki - Peritune',
  } as const

  const SFX = {
    card1: `${bucketUrl}/sfx/card1.m4a`,
    card2: `${bucketUrl}/sfx/card2.m4a`,
    coin: `${bucketUrl}/sfx/coins-counting.m4a`,
    slash: `${bucketUrl}/sfx/sword-slash-and-swing-185432.mp3`,
  } as const

  const audioRefA = ref<HTMLAudioElement>()
  const audioRefB = ref<HTMLAudioElement>()
  const isUsingA = ref(true)
  const isPlaying = ref(false)
  const shouldBePlaying = ref(false) // Track intended playing state
  const audioContext = ref<AudioContext | null>(null)
  const hasUserInteracted = ref(false)

  // Add current track tracking
  const currentTrack = ref<string | null>(null)

  // Load preferences from localStorage with separate BGM and SFX controls
  const systemPreferences = useStorage('hanafuda-system-preferences', {
    bgm: {
      volume: 0.25,
      isDisabled: false,
    },
    sfx: {
      volume: 0.25,
      isDisabled: false,
    },
    // Legacy fallback support
    volume: 0.25,
    isMuted: false,
  })

  // Migrate legacy settings if they exist and new structure doesn't
  if (systemPreferences.value.volume !== undefined && !systemPreferences.value.bgm) {
    systemPreferences.value.bgm = {
      volume: systemPreferences.value.volume,
      isDisabled: false,
    }
    systemPreferences.value.sfx = {
      volume: systemPreferences.value.volume,
      isDisabled: false,
    }
  }

  // Ensure disabled property exists (for users upgrading from older versions)
  if (systemPreferences.value.bgm && systemPreferences.value.bgm.isDisabled === undefined) {
    systemPreferences.value.bgm.isDisabled = false
  }
  if (systemPreferences.value.sfx && systemPreferences.value.sfx.isDisabled === undefined) {
    systemPreferences.value.sfx.isDisabled = false
  }

  const bgmVolume = ref(systemPreferences.value.bgm?.volume ?? 0.25)
  const bgmDisabled = ref(systemPreferences.value.bgm?.isDisabled ?? false)
  const sfxVolume = ref(systemPreferences.value.sfx?.volume ?? 0.25)
  const sfxDisabled = ref(systemPreferences.value.sfx?.isDisabled ?? false)

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

  // Initialize audio element with mobile compatibility (for BGM)
  const initAudio = (src: string) => {
    if (!import.meta.client) return

    const ref = currentAudioRef.value
    ref.value = new Audio(src)
    ref.value.loop = true
    ref.value.preload = 'auto'
    ref.value.volume = bgmVolume.value

    // Add mobile-specific attributes
    ref.value.setAttribute('playsinline', 'true')
    ref.value.setAttribute('webkit-playsinline', 'true')

    // Set current track
    currentTrack.value = src

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
    // Don't play if BGM is disabled
    if (bgmDisabled.value || !currentAudioRef.value.value) return

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
        shouldBePlaying.value = true
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
      shouldBePlaying.value = false
    }
  }

  // Stop audio with fade-out (active only)
  const stopAudio = (fadeDuration: number = 2) => {
    if (!currentAudioRef.value.value) return
    fadeOutAudio(fadeDuration)
  }

  // Fade in audio (active only) - for BGM
  const fadeInAudio = (duration: number = 3) => {
    if (!currentAudioRef.value.value) return
    const startVolume = 0
    const targetVolume = bgmVolume.value
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
        shouldBePlaying.value = false
        clearInterval(fadeInterval)
      }
    }, 50)
  }

  // Set BGM volume (both refs)
  const setBgmVolume = (volume: number) => {
    bgmVolume.value = Math.max(0, Math.min(1, volume))
    if (audioRefA.value) audioRefA.value.volume = bgmVolume.value
    if (audioRefB.value) audioRefB.value.volume = bgmVolume.value
  }

  // Set SFX volume
  const setSfxVolume = (volume: number) => {
    sfxVolume.value = Math.max(0, Math.min(1, volume))
  }

  // Toggle BGM disabled state
  const toggleBgmDisabled = () => {
    const wasDisabled = bgmDisabled.value
    bgmDisabled.value = !bgmDisabled.value

    if (bgmDisabled.value) {
      // If disabling BGM, stop any currently playing BGM
      if (currentAudioRef.value.value) {
        currentAudioRef.value.value.pause()
        isPlaying.value = false
        // Keep shouldBePlaying state so we can resume later
      }
    } else {
      // If re-enabling BGM, resume if it should be playing
      if (shouldBePlaying.value && currentTrack.value) {
        playAudio()
      }
    }
  }

  // Toggle SFX disabled state
  const toggleSfxDisabled = () => {
    sfxDisabled.value = !sfxDisabled.value
  }

  // Legacy functions for backward compatibility
  const setVolume = setBgmVolume
  const toggleMute = toggleBgmDisabled

  // Enhanced crossfade with mobile compatibility
  const crossfadeTo = async (src: string, duration: number = 3) => {
    if (!import.meta.client) return

    // Set intent to play this track
    shouldBePlaying.value = true
    currentTrack.value = src

    // Don't start new BGM if disabled, but remember the intent
    if (bgmDisabled.value) {
      // If BGM is disabled, stop any currently playing BGM
      if (currentAudioRef.value.value) {
        currentAudioRef.value.value.pause()
        isPlaying.value = false
      }
      return
    }

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
    const toTargetVolume = bgmVolume.value
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
    shouldBePlaying.value = false
  }

  // Watch and save changes to localStorage
  watch(bgmVolume, (newVolume) => {
    systemPreferences.value.bgm.volume = newVolume
  })

  watch(bgmDisabled, (newDisabledState) => {
    systemPreferences.value.bgm.isDisabled = newDisabledState
  })

  watch(sfxVolume, (newVolume) => {
    systemPreferences.value.sfx.volume = newVolume
  })

  watch(sfxDisabled, (newDisabledState) => {
    systemPreferences.value.sfx.isDisabled = newDisabledState
  })

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  // Enhanced SFX with mobile compatibility
  const playSfx = (src: string) => {
    if (!import.meta.client) return

    // Don't play if SFX is disabled
    if (sfxDisabled.value) {
      return Promise.resolve()
    }

    const sfx = new Audio(src)
    sfx.volume = sfxVolume.value
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

  // Helper to get current track name
  const getCurrentTrackName = () => {
    if (!currentTrack.value) return null

    const trackKey = Object.keys(trackNames).find((key) => currentTrack.value?.includes(key))

    return trackKey ? trackNames[trackKey as keyof typeof trackNames] : null
  }

  return {
    // Constants
    BGM,
    SFX,

    // State
    isPlaying: readonly(isPlaying),
    hasUserInteracted: readonly(hasUserInteracted),
    currentTrack: readonly(currentTrack),
    currentTrackName: readonly(computed(getCurrentTrackName)),

    // BGM State and Methods
    bgmVolume: readonly(bgmVolume),
    bgmDisabled: readonly(bgmDisabled),
    setBgmVolume,
    toggleBgmDisabled,

    // SFX State and Methods
    sfxVolume: readonly(sfxVolume),
    sfxDisabled: readonly(sfxDisabled),
    setSfxVolume,
    toggleSfxDisabled,

    // Legacy for backward compatibility
    currentVolume: readonly(bgmVolume), // Alias to bgmVolume
    isMuted: readonly(bgmDisabled), // Alias to bgmDisabled (now represents disabled state)
    setVolume,
    toggleMute,

    // Methods
    initAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    fadeInAudio,
    fadeOutAudio,
    setupAutoplay,
    cleanup,
    crossfadeTo,
    playSfx,
    initAudioContext,
  }
}
