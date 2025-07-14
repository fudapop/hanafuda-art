// Service Worker for Hanafuda Card Caching
const CACHE_NAME = 'hanafuda-cards-v2'
const CARD_DESIGNS = [
  'cherry-version',
  'sabling-art', 
  'otwarte-karty',
  'modern',
  'hanami',
  'moon-rabbit',
  'koinobori',
  'nishiki-fuda',
  'vaporwave',
  'hanamaki',
  'hana-awase',
  'kinbotan',
  'post-card',
  'flash-black',
  'ramen-red'
]

const DECK = [
  'matsu-ni-tsuru', 'matsu-no-tan', 'matsu-no-kasu-1', 'matsu-no-kasu-2',
  'ume-ni-uguisu', 'ume-no-tan', 'ume-no-kasu-1', 'ume-no-kasu-2',
  'sakura-ni-maku', 'sakura-no-tan', 'sakura-no-kasu-1', 'sakura-no-kasu-2',
  'ayame-ni-yatsuhashi', 'ayame-no-tan', 'ayame-no-kasu-1', 'ayame-no-kasu-2',
  'hagi-ni-inoshishi', 'hagi-no-tan', 'hagi-no-kasu-1', 'hagi-no-kasu-2',
  'botan-ni-chou', 'botan-no-tan', 'botan-no-kasu-1', 'botan-no-kasu-2',
  'fuji-ni-kakku', 'fuji-no-tan', 'fuji-no-kasu-1', 'fuji-no-kasu-2',
  'susuki-ni-tsuki', 'susuki-ni-kari', 'susuki-no-kasu-1', 'susuki-no-kasu-2',
  'kiku-ni-sakazuki', 'kiku-no-tan', 'kiku-no-kasu-1', 'kiku-no-kasu-2',
  'momiji-ni-shika', 'momiji-no-tan', 'momiji-no-kasu-1', 'momiji-no-kasu-2',
  'yanagi-ni-ono-no-toufuu', 'yanagi-ni-tsubame', 'yanagi-no-tan', 'yanagi-no-kasu',
  'kiri-ni-ho-oh', 'kiri-no-kasu-1', 'kiri-no-kasu-2', 'kiri-no-kasu-3'
]

const BASE_URL = 'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/render/image/public/static/cards/'

const TRANSFORM = '?width=120&resize=contain'

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Hanafuda Service Worker installing...')
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Hanafuda Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Handle messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'CACHE_DESIGN':
      await handleCacheDesign(event.source, data)
      break
    case 'CACHE_ALL_DESIGNS':
      await handleCacheAllDesigns(event.source, data)
      break
    case 'GET_CACHE_STATUS':
      await getCacheStatus(event.source, data)
      break
    case 'CLEAR_CACHE':
      await clearCache(event.source)
      break
    default:
      console.warn('Unknown message type:', type)
  }
})

// Cache a specific design
async function handleCacheDesign(client, { design, formatExt = 'webp' }) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const urls = []
    
    // Generate URLs for all cards in the design
    for (const cardName of DECK) {
      const url = `${BASE_URL}${design}/${cardName}.${formatExt}${TRANSFORM}`
      urls.push(url)
    }
    
    // Add card back image
    // urls.push(`${BASE_URL}${design}/card-back.${formatExt}${TRANSFORM}`)
    
    let cached = 0
    const total = urls.length
    
    // Send initial progress
    client.postMessage({
      type: 'CACHE_PROGRESS',
      data: { design, progress: 0, total, cached: 0 }
    })
    
    // Cache each URL
    for (const url of urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response.clone())
          cached++
          
          // Send progress update
          client.postMessage({
            type: 'CACHE_PROGRESS',
            data: { 
              design, 
              progress: Math.round((cached / total) * 100), 
              total, 
              cached,
              currentCard: url.split('/').pop()?.split('?')[0]
            }
          })
        }
      } catch (error) {
        console.warn(`Failed to cache ${url}:`, error)
      }
    }
    
    // Send completion message
    client.postMessage({
      type: 'CACHE_COMPLETE',
      data: { design, success: true, total, cached }
    })
    
  } catch (error) {
    console.error('Design caching failed:', error)
    client.postMessage({
      type: 'CACHE_ERROR',
      data: { design, error: error.message }
    })
  }
}

// Get cache status
async function getCacheStatus(client, { design, formatExt = 'webp' }) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = []
    
    // Generate URLs for the design
    for (const cardName of DECK) {
      const url = `${BASE_URL}${design}/${cardName}.${formatExt}${TRANSFORM}`
      requests.push(url)
    }
    // requests.push(`${BASE_URL}${design}/card-back.webp${TRANSFORM}`)
    
    // Check which URLs are cached
    const cachedUrls = []
    for (const url of requests) {
      const response = await cache.match(url)
      if (response) {
        cachedUrls.push(url)
      }
    }
    
    const total = requests.length
    const cached = cachedUrls.length
    const progress = Math.round((cached / total) * 100)
    
    client.postMessage({
      type: 'CACHE_STATUS',
      data: { design, total, cached, progress, isComplete: cached === total }
    })
    
  } catch (error) {
    client.postMessage({
      type: 'CACHE_STATUS_ERROR',
      data: { error: error.message }
    })
  }
}

// Clear cache
async function clearCache(client) {
  try {
    await caches.delete(CACHE_NAME)
    client.postMessage({
      type: 'CACHE_CLEARED',
      data: { success: true }
    })
  } catch (error) {
    client.postMessage({
      type: 'CACHE_CLEAR_ERROR',
      data: { error: error.message }
    })
  }
}

// Intercept fetch requests to serve from cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Only handle card image requests
  if (url.hostname === 'ymoriyakbittfgocvxbw.supabase.co' && 
      url.pathname.match(/\/storage\/v1\/(object|render\/image)\/public\/static\/cards\/.*/)) {
    
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached response if available
        if (response) {
          return response
        }
        
        // Otherwise fetch from network and cache it
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
      })
    )
  }
}) 