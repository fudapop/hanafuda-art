/**
 * Color Mode Initialization Script
 *
 * This script runs synchronously in the <head> before render to prevent
 * flash of unstyled content (FOUC).
 *
 * It reads color mode preference from localStorage and applies the 'dark'
 * class to the HTML element immediately, before any rendering occurs.
 */
;(function () {
  try {
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

    const html = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (colorMode === 'dark' || (colorMode === 'auto' && prefersDark)) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  } catch (e) {
    console.error('Error applying color mode:', e)
  }
})()
