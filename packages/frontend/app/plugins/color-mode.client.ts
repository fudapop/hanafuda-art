export default defineNuxtPlugin(() => {
  // Sync color mode between VueUse and localStorage preferences
  // This ensures PWA standalone mode works correctly
  if (process.client) {
    const syncColorMode = () => {
      try {
        // Get preferences from localStorage
        const storage = localStorage.getItem('hanafuda-system-preferences')
        let colorMode = 'auto'

        if (storage) {
          try {
            const prefs = JSON.parse(storage)
            colorMode = prefs.colorMode || 'auto'
          } catch (e) {
            // Fallback to VueUse color mode storage
            colorMode = localStorage.getItem('vueuse-color-scheme') || 'auto'
          }
        } else {
          // Check VueUse storage as fallback
          colorMode = localStorage.getItem('vueuse-color-scheme') || 'auto'
        }

        // Apply immediately to HTML element
        const html = document.documentElement
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

        if (colorMode === 'dark' || (colorMode === 'auto' && prefersDark)) {
          html.classList.add('dark')
        } else {
          html.classList.remove('dark')
        }

        // Sync with VueUse storage
        if (colorMode !== localStorage.getItem('vueuse-color-scheme')) {
          localStorage.setItem('vueuse-color-scheme', colorMode)
        }
      } catch (e) {
        console.error('Error syncing color mode:', e)
      }
    }

    // Sync on mount
    syncColorMode()

    // Watch for system preference changes (for 'auto' mode)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      const storage = localStorage.getItem('hanafuda-system-preferences')
      let colorMode = 'auto'

      if (storage) {
        try {
          const prefs = JSON.parse(storage)
          colorMode = prefs.colorMode || 'auto'
        } catch (e) {
          colorMode = localStorage.getItem('vueuse-color-scheme') || 'auto'
        }
      }

      if (colorMode === 'auto') {
        syncColorMode()
      }
    }

    // Listen for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange)
    }

    // Watch for storage changes (when user changes color mode in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'hanafuda-system-preferences' || e.key === 'vueuse-color-scheme') {
        syncColorMode()
      }
    })

    // Watch for same-tab storage updates using a custom event
    // Components will dispatch this event when they update color mode
    window.addEventListener('color-mode-change', syncColorMode)
  }
})
