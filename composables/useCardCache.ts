/**
 * Singleton composable for on-demand card design caching with hover-based preloading.
 *
 * This composable ensures all components share the same cache state, event listeners,
 * and logic. Multiple calls to `useCardCache()` will always return the same instance.
 *
 * Usage example:
 * ```ts
 * const { cacheDesignOnHover, isDesignCached, cacheDesignIfNeeded } = useCardCache()
 *
 * // In a component:
 * <div @mouseenter="cacheDesignOnHover('koinobori')"
 *      @click="loadDesign('koinobori')">
 *   Koinobori Design
 * </div>
 *
 * // Check if already cached before showing loading state
 * if (!isDesignCached('koinobori')) {
 *   showLoading.value = true
 *   await cacheDesignIfNeeded('koinobori')
 *   showLoading.value = false
 * }
 * ```
 *
 * Notes:
 * - All state and listeners are shared across the app.
 * - Prevents duplicate event listeners and inconsistent cache state.
 * - Use this composable anywhere you need to interact with card image caching.
 */
let cacheInstance: ReturnType<typeof createCardCache> | null = null

const createCardCache = () => {
  const isSupported = ref(false)
  const isRegistered = ref(false)
  const registration = ref<ServiceWorkerRegistration | null>(null)
  const cacheProgress = ref(0)
  const cacheInProgress = ref(false)
  const currentOperation = ref('')
  const cacheStatus = ref<
    Record<string, { total: number; cached: number; progress: number; isComplete: boolean }>
  >({})

  // Track pending cache requests to avoid duplicates
  const pendingRequests = ref<Set<string>>(new Set())

  // Check if service workers are supported
  const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator
    return isSupported.value
  }

  // Register the service worker
  const register = async () => {
    if (!checkSupport()) {
      console.warn('Service workers not supported')
      return false
    }

    try {
      registration.value = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      isRegistered.value = true
      console.debug('Card Cache Service Worker registered successfully')

      // Set up message listener
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  // Handle messages from service worker
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, data } = event.data

    switch (type) {
      case 'CACHE_PROGRESS':
        cacheProgress.value = data.progress
        currentOperation.value = `Caching ${data.design}: ${data.progress}%`
        break

      case 'CACHE_COMPLETE':
        cacheProgress.value = 100
        cacheInProgress.value = false
        currentOperation.value = `Completed caching ${data.design}`
        // Remove from pending requests
        pendingRequests.value.delete(data.design)
        // Update cache status to reflect completion
        if (cacheStatus.value[data.design]) {
          cacheStatus.value[data.design].isComplete = true
          cacheStatus.value[data.design].progress = 100
          cacheStatus.value[data.design].cached = data.cached
        } else {
          cacheStatus.value[data.design] = {
            total: data.total,
            cached: data.cached,
            progress: 100,
            isComplete: true,
          }
        }
        console.debug(`Cached ${data.cached}/${data.total} cards for ${data.design}`)
        break

      case 'CACHE_STATUS':
        cacheStatus.value[data.design] = {
          ...data,
          isComplete: data.progress === 100 && data.cached === data.total,
        }
        break

      case 'CACHE_STATUS_ERROR':
        console.error('Failed to get cache status:', data.error)
        break

      case 'CACHE_ERROR':
        cacheInProgress.value = false
        currentOperation.value = `Error: ${data.error}`
        // Remove from pending requests on error
        if (data.design) {
          pendingRequests.value.delete(data.design)
        }
        console.error('Cache error:', data.error)
        break

      case 'CACHE_CLEARED':
        console.debug('Cache cleared successfully')
        // Reset cache status since cache was cleared
        cacheStatus.value = {}
        break

      case 'CACHE_CLEAR_ERROR':
        console.error('Failed to clear cache:', data.error)
        break
    }
  }

  // Send message to service worker
  const sendMessage = (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!registration.value?.active) {
        reject(new Error('Service Worker not active'))
        return
      }

      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      registration.value!.active!.postMessage(message, [messageChannel.port2])
    })
  }

  // Cache a specific design
  const cacheDesign = async (design: string, formatExt = 'webp') => {
    if (!isRegistered.value) {
      await register()
    }

    // Check if already in progress
    if (pendingRequests.value.has(design)) {
      console.debug(`Cache request for ${design} already in progress`)
      return false
    }

    pendingRequests.value.add(design)
    cacheInProgress.value = true
    cacheProgress.value = 0
    currentOperation.value = `Starting to cache ${design}`

    try {
      await sendMessage({
        type: 'CACHE_DESIGN',
        data: { design, formatExt },
      })
      return true
    } catch (error) {
      cacheInProgress.value = false
      pendingRequests.value.delete(design)
      console.error('Failed to start design caching:', error)
      return false
    }
  }

  // Check if a design is already cached
  const isDesignCached = (design: string): boolean => {
    const status = cacheStatus.value[design]
    return status?.isComplete ?? false
  }

  // Check if a design is currently being cached
  const isDesignCaching = (design: string): boolean => {
    const status = cacheStatus.value[design]
    return status && !status.isComplete && status.progress > 0
  }

  // Cache a design only if not already cached
  const cacheDesignIfNeeded = async (design: string, formatExt = 'webp') => {
    // First check if already cached
    if (isDesignCached(design)) {
      console.debug(`Design ${design} already cached, skipping`)
      return { wasCached: true, started: false }
    }

    // Check if currently being cached
    if (isDesignCaching(design) || pendingRequests.value.has(design)) {
      console.debug(`Design ${design} currently being cached, skipping`)
      return { wasCached: false, started: false }
    }

    // Start caching
    const started = await cacheDesign(design, formatExt)
    return { wasCached: false, started }
  }

  // Throttled version for hover events - prevents too many simultaneous requests
  const hoverTimeouts = new Map<string, NodeJS.Timeout>()

  const cacheDesignOnHover = (design: string, formatExt = 'webp', delay = 300) => {
    // Clear existing timeout for this design
    if (hoverTimeouts.has(design)) {
      clearTimeout(hoverTimeouts.get(design)!)
      hoverTimeouts.delete(design)
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
      await cacheDesignIfNeeded(design, formatExt)
      hoverTimeouts.delete(design)
    }, delay)

    hoverTimeouts.set(design, timeoutId)
  }

  // Get cache status for a design
  const getCacheStatus = async (design: string, formatExt = 'webp') => {
    if (!isRegistered.value) {
      await register()
    }

    try {
      await sendMessage({
        type: 'GET_CACHE_STATUS',
        data: { design, formatExt },
      })
    } catch (error) {
      console.error('Failed to get cache status:', error)
    }
  }

  // Clear cache
  const clearCache = async () => {
    if (!isRegistered.value) {
      await register()
    }

    try {
      await sendMessage({
        type: 'CLEAR_CACHE',
      })
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  // Clear all hover timeouts
  const clearHoverTimeouts = () => {
    hoverTimeouts.forEach((timeout) => clearTimeout(timeout))
    hoverTimeouts.clear()
  }

  // Unregister service worker
  const unregister = async () => {
    clearHoverTimeouts()
    if (registration.value) {
      await registration.value.unregister()
      isRegistered.value = false
      registration.value = null
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
    }
  }

  return {
    isSupported: readonly(isSupported),
    isRegistered: readonly(isRegistered),
    cacheProgress: readonly(cacheProgress),
    cacheInProgress: readonly(cacheInProgress),
    currentOperation: readonly(currentOperation),
    cacheStatus: readonly(cacheStatus),
    checkSupport,
    register,
    cacheDesign,
    cacheDesignIfNeeded,
    cacheDesignOnHover,
    isDesignCached,
    isDesignCaching,
    getCacheStatus,
    clearCache,
    clearHoverTimeouts,
    unregister,
  }
}

export const useCardCache = () => {
  if (!cacheInstance) {
    cacheInstance = createCardCache()
  }
  return cacheInstance
}
