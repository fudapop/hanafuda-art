export default defineNuxtPlugin({
  name: 'audio-visibility',
  setup() {
    // Wait for app to be ready, then set up listener
    const nuxtApp = useNuxtApp()

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let handleVisibilityChange: (() => void) | null = null

    nuxtApp.hook('app:mounted', () => {
      const getAudioInstance = () => {
        return (
          (nuxtApp.$audio as ReturnType<typeof import('~/composables/useAudio').useAudio>) || null
        )
      }

      handleVisibilityChange = () => {
        const audioInstance = getAudioInstance()

        if (!audioInstance) return

        try {
          if (document.hidden) {
            // Tab/window is hidden - pause audio but preserve shouldBePlaying state
            if (audioInstance.isPlaying?.value && audioInstance.pauseAudioPreservingState) {
              audioInstance.pauseAudioPreservingState()
            }
          } else {
            // Tab/window is visible - resume if it should be playing
            if (
              audioInstance.shouldBePlaying?.value &&
              !audioInstance.bgmDisabled?.value &&
              audioInstance.playAudio
            ) {
              audioInstance.playAudio()
            }
          }
        } catch (error) {
          console.error('Error handling audio visibility change:', error)
        }
      }

      // Set up listener with a small delay to ensure audio is initialized
      timeoutId = setTimeout(() => {
        if (handleVisibilityChange) {
          document.addEventListener('visibilitychange', handleVisibilityChange)
        }
      }, 100)
    })

    // Cleanup on plugin teardown
    onScopeDispose(() => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (handleVisibilityChange) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        handleVisibilityChange = null
      }
    })
  },
})
