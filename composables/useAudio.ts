import { useStorage } from '@vueuse/core'

interface LegacySystemPreferences {
  volume: number
  isMuted: boolean
}

interface AudioSettings {
  volume: number
  isDisabled: boolean
}

interface SystemPreferences extends LegacySystemPreferences {
  bgm: AudioSettings
  sfx: AudioSettings
}

export const useAudio = () => {
  const config = useRuntimeConfig()

  const bucketUrl = `${config.public.supabaseUrl}/storage/v1/object/public/static/audio`

  // BGM tracks with fallback formats (browser will try in order)
  const BGM_TRACKS = {
    main: {
      name: 'Awayuki',
      artwork: `${bucketUrl}/art/gambler-september-logo-512.png`,
      sources: [
        `${bucketUrl}/bgm/PerituneMaterial_Awayuki.ogg`,
        `${bucketUrl}/bgm/PerituneMaterial_Awayuki.m4a`,
        `${bucketUrl}/bgm/PerituneMaterial_Awayuki.mp3`,
      ],
    },
    koikoi1: {
      name: 'Epic Battle J',
      artwork: `${bucketUrl}/art/gambler-june-logo-512.png`,
      sources: [
        `${bucketUrl}/bgm/PerituneMaterial_EpicBattle_J_loop.ogg`,
        `${bucketUrl}/bgm/PerituneMaterial_EpicBattle_J_loop.m4a`,
        `${bucketUrl}/bgm/PerituneMaterial_EpicBattle_J_loop.mp3`,
      ],
    },
    koikoi2: {
      name: 'Kengeki',
      artwork: `${bucketUrl}/art/gambler-october-logo-512.png`,
      sources: [
        `${bucketUrl}/bgm/PerituneMaterial_Kengeki_loop.ogg`,
        `${bucketUrl}/bgm/PerituneMaterial_Kengeki_loop.m4a`,
        `${bucketUrl}/bgm/PerituneMaterial_Kengeki_loop.mp3`,
      ],
    },
  } as const

  // Create audio element with fallback sources
  const createAudioWithFallbacks = (sources: readonly string[]): HTMLAudioElement => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true

    // Try each source until one works
    let currentSourceIndex = 0

    const tryNextSource = () => {
      if (currentSourceIndex < sources.length) {
        audio.src = sources[currentSourceIndex]
        currentSourceIndex++
      }
    }

    // If current source fails, try the next one
    audio.addEventListener('error', () => {
      console.warn(`Audio source failed: ${audio.src}, trying next...`)
      tryNextSource()
    })

    // Start with first source
    tryNextSource()

    return audio
  }

  // Legacy BGM object for backward compatibility
  const BGM = {
    main: BGM_TRACKS.main.sources[0], // Default to first (preferred) format
    koikoi1: BGM_TRACKS.koikoi1.sources[0],
    koikoi2: BGM_TRACKS.koikoi2.sources[0],
    // Keep legacy fallback format properties for any existing references
    mainM4a: BGM_TRACKS.main.sources[1],
    koikoi1M4a: BGM_TRACKS.koikoi1.sources[1],
    koikoi2M4a: BGM_TRACKS.koikoi2.sources[1],
    mainMp3: BGM_TRACKS.main.sources[2],
    koikoi1Mp3: BGM_TRACKS.koikoi1.sources[2],
    koikoi2Mp3: BGM_TRACKS.koikoi2.sources[2],
  } as const

  // Enhanced track names mapping that works with any format
  const getTrackName = (src: string): string | null => {
    for (const [trackKey, trackData] of Object.entries(BGM_TRACKS)) {
      for (const sourceUrl of trackData.sources) {
        if (src.includes(sourceUrl) || sourceUrl.includes(src)) {
          return trackData.name
        }
      }
    }
    return null
  }

  const SFX = {
    card1: `${bucketUrl}/sfx/card1.m4a`,
    card2: `${bucketUrl}/sfx/card2.m4a`,
    card3: `${bucketUrl}/sfx/card3.m4a`,
    coin: `${bucketUrl}/sfx/coins-counting.m4a`,
    slash: `${bucketUrl}/sfx/sword-slash-and-swing-185432.mp3`,
  } as const

  const getAudioSourceUrls = (): { bgm: string[]; sfx: string[]; art: string[] } => {
    const bgm = Array.from(Object.values(BGM))
    const sfx = Array.from(Object.values(SFX))
    const art = Object.entries(BGM_TRACKS).map(([_, track]) => track.artwork)
    return { bgm, sfx, art }
  }

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
  const systemPreferences = useStorage<SystemPreferences>('hanafuda-system-preferences', {
    bgm: {
      volume: 0.2,
      isDisabled: false,
    },
    sfx: {
      volume: 0.3,
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

  const bgmVolume: Ref<number> = ref(systemPreferences.value.bgm?.volume ?? 0.25)
  const bgmDisabled: Ref<boolean> = ref(systemPreferences.value.bgm?.isDisabled ?? false)
  const sfxVolume: Ref<number> = ref(systemPreferences.value.sfx?.volume ?? 0.25)
  const sfxDisabled: Ref<boolean> = ref(systemPreferences.value.sfx?.isDisabled ?? false)

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
          .catch((error: unknown) => {
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

  // Media Session API support
  const setupMediaSession = (trackKey: keyof typeof BGM_TRACKS) => {
    if (!import.meta.client || !navigator.mediaSession) return

    const track = BGM_TRACKS[trackKey]

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: 'Peritune',
      album: 'Hanafuda Koi-Koi BGM',
      artwork: [
        {
          src: track.artwork, // You can add your game logo
          sizes: '512x512',
          type: 'image/webp',
        },
        {
          src: 'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/logo-title.webp', // Fallback
          sizes: '512x512',
          type: 'image/webp',
        },
      ],
    })

    // Set up media session action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      playAudio()
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      pauseAudio()
    })

    // Update playback state
    navigator.mediaSession.playbackState = 'playing'
  }

  const updateMediaSessionState = (isPlayingState: boolean) => {
    if (!import.meta.client || !navigator.mediaSession) return

    navigator.mediaSession.playbackState = isPlayingState ? 'playing' : 'paused'
  }

  const clearMediaSession = () => {
    if (!import.meta.client || !navigator.mediaSession) return

    navigator.mediaSession.metadata = null
    navigator.mediaSession.setActionHandler('play', null)
    navigator.mediaSession.setActionHandler('pause', null)
    navigator.mediaSession.playbackState = 'none'
  }

  // Enhanced initAudio with Media Session support
  const initAudio = (trackKeyOrSrc: keyof typeof BGM_TRACKS | string) => {
    if (!import.meta.client) return

    const ref = currentAudioRef.value

    if (typeof trackKeyOrSrc === 'string' && trackKeyOrSrc.startsWith('http')) {
      // Direct URL provided
      ref.value = new Audio(trackKeyOrSrc)
      ref.value.loop = true
      ref.value.preload = 'auto'
      currentTrack.value = trackKeyOrSrc

      // Try to find matching track key for Media Session
      for (const [key, trackData] of Object.entries(BGM_TRACKS)) {
        if (trackData.sources.includes(trackKeyOrSrc as any)) {
          setupMediaSession(key as keyof typeof BGM_TRACKS)
          break
        }
      }
    } else {
      // Track key provided - use fallback system
      const trackKey = trackKeyOrSrc as keyof typeof BGM_TRACKS
      const track = BGM_TRACKS[trackKey]
      ref.value = createAudioWithFallbacks(track.sources)
      currentTrack.value = track.sources[0]

      // Setup Media Session for this track
      setupMediaSession(trackKey)
    }

    ref.value.volume = bgmVolume.value

    // Add mobile-specific attributes
    ref.value.setAttribute('playsinline', 'true')
    ref.value.setAttribute('webkit-playsinline', 'true')

    // Handle mobile audio loading
    ref.value.addEventListener('canplaythrough', () => {
      // Audio loaded successfully - no need to log this
    })

    ref.value.addEventListener('error', (e: unknown) => {
      console.error('Audio loading error:', e)
    })
  }

  // Enhanced playAudio with Media Session state update
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

        // Update Media Session state
        updateMediaSessionState(true)
      }
    } catch (error) {
      console.warn('Audio autoplay failed:', error)
      // For mobile, try to show a user-friendly message
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('Audio blocked by browser policy. User interaction required.')
      }
    }
  }

  // Enhanced pauseAudio with Media Session state update
  const pauseAudio = () => {
    if (currentAudioRef.value.value) {
      currentAudioRef.value.value.pause()
      isPlaying.value = false
      shouldBePlaying.value = false

      // Update Media Session state
      updateMediaSessionState(false)
    }
  }

  // Pause audio without resetting shouldBePlaying (for visibility changes)
  const pauseAudioPreservingState = () => {
    if (audioRefA.value && !audioRefA.value.paused) {
      audioRefA.value.pause()
    }
    if (audioRefB.value && !audioRefB.value.paused) {
      audioRefB.value.pause()
    }
    isPlaying.value = false
    updateMediaSessionState(false)
  }

  // Note: Visibility change handling is done in plugins/audio-visibility.client.ts
  // This keeps the listener setup separate and ensures it runs on client-side only

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

  // Enhanced crossfade with mobile compatibility and automatic fallback support
  const crossfadeTo = async (
    trackKeyOrSrc: keyof typeof BGM_TRACKS | string,
    duration: number = 3,
  ) => {
    if (!import.meta.client) return

    let targetSrc: string
    let newAudio: HTMLAudioElement

    if (typeof trackKeyOrSrc === 'string' && trackKeyOrSrc.startsWith('http')) {
      // Direct URL provided
      targetSrc = trackKeyOrSrc
      newAudio = new Audio(targetSrc)
      newAudio.loop = true
      newAudio.preload = 'auto'

      // Try to find matching track key for Media Session
      for (const [key, trackData] of Object.entries(BGM_TRACKS)) {
        if (trackData.sources.includes(trackKeyOrSrc as any)) {
          setupMediaSession(key as keyof typeof BGM_TRACKS)
          break
        }
      }
    } else {
      // Track key provided - use fallback system
      const trackKey = trackKeyOrSrc as keyof typeof BGM_TRACKS
      const track = BGM_TRACKS[trackKey]
      targetSrc = track.sources[0] // Set to preferred format for comparison
      newAudio = createAudioWithFallbacks(track.sources)

      // Setup Media Session for this track
      setupMediaSession(trackKey)
    }

    // Set intent to play this track
    shouldBePlaying.value = true
    currentTrack.value = targetSrc

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
    // Return if the same track is already playing (check against all formats)
    if (fromRef.value?.src && isSameTrack(fromRef.value.src, targetSrc)) {
      return
    }

    const toRef = inactiveAudioRef.value

    // Use the audio element with fallbacks
    toRef.value = newAudio
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

  // Preload audio files into the cache
  const preloadAudioCache = async () => {
    const { bgm, sfx, art } = getAudioSourceUrls()
    // Preload the default format
    const urls = [...bgm.filter((src) => src.endsWith('ogg')), ...sfx, ...art]
    await Promise.allSettled(urls.map(async (url) => fetch(url, { mode: 'no-cors' })))
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

  // Enhanced cleanup with Media Session cleanup
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

    // Clear Media Session
    clearMediaSession()
  }

  // Watch and save changes to localStorage
  watch(bgmVolume, (newVolume: number) => {
    systemPreferences.value.bgm.volume = newVolume
  })

  watch(bgmDisabled, (newDisabledState: boolean) => {
    systemPreferences.value.bgm.isDisabled = newDisabledState
  })

  watch(sfxVolume, (newVolume: number) => {
    systemPreferences.value.sfx.volume = newVolume
  })

  watch(sfxDisabled, (newDisabledState: boolean) => {
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

  // Helper to check if two audio sources are the same track (different formats)
  const isSameTrack = (src1: string, src2: string): boolean => {
    const name1 = getTrackName(src1)
    const name2 = getTrackName(src2)
    return name1 !== null && name1 === name2
  }

  // Helper to get current track name
  const getCurrentTrackName = () => {
    if (!currentTrack.value) return null
    return getTrackName(currentTrack.value)
  }

  return {
    // Constants
    BGM,
    BGM_TRACKS, // Expose track data for advanced usage
    SFX,

    // State
    isPlaying: readonly(isPlaying),
    shouldBePlaying: readonly(shouldBePlaying), // Expose for visibility handling
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
    preloadAudioCache,
    initAudio,
    playAudio,
    pauseAudio,
    pauseAudioPreservingState, // For visibility changes
    stopAudio,
    fadeInAudio,
    fadeOutAudio,
    setupAutoplay,
    cleanup,
    crossfadeTo,
    playSfx,
    initAudioContext,
    createAudioWithFallbacks, // Expose for advanced usage

    // Media Session methods (for advanced usage)
    setupMediaSession,
    updateMediaSessionState,
    clearMediaSession,
  }
}
