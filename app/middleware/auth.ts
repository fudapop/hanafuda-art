export default defineNuxtRouteMiddleware(async (to, from) => {
  if (!import.meta.client) return
  const { getCurrentUser } = await import('vuefire')
  const user = await getCurrentUser()

  // Get fresh composable instances for each middleware run
  const { getProfile, current } = useProfile()

  // If the auth watcher is actively handling a sign-in/out or a guest transfer,
  // avoid loading/creating profiles here to prevent races and data overwrites.
  const isHandlingAuth = useState('auth-handling', () => false)
  if (isHandlingAuth.value) {
    return
  }

  if (user) {
    // Authenticated user - ensure their profile is loaded
    // Skip while a guest profile is currently loaded; the auth watcher will handle transfer
    if (current.value?.isGuest) {
      return
    }

    if (!current.value || current.value.uid !== user.uid) {
      try {
        await getProfile(user)
      } catch (err) {
        console.error('Failed to load profile in middleware:', err)
        // Allow navigation to continue - components should handle the error state
      }
    }
  } else {
    // No Firebase user - ensure a guest profile exists on non-auth routes
    // Do nothing on the sign-in page to avoid immediate creation after logout
    // Check for sign-in route regardless of locale
    const isSignInRoute = to.path.includes('/sign-in')

    if (!isSignInRoute) {
      try {
        const { createLocalGuestProfile } = await import('~/composables/usePlayerProfile')
        const { loadLocalGuestProfile } = useProfile()

        if (!current.value || !current.value.isGuest) {
          const guest = await createLocalGuestProfile()
          await loadLocalGuestProfile(guest)
        }
      } catch (err) {
        console.error('Failed to create/load guest profile in middleware:', err)
      }
    }
  }
})
