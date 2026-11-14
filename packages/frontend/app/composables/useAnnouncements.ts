import { useLocalStorage } from '@vueuse/core'
import { getAuth } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

export type Announcement = {
  id: string
  title: string
  description: string
  date: string
  features: string[]
  // Content body from markdown (Nuxt Content parsed AST)
  body?: object
  // Impression tracking
  impressions?: {
    views: number
    likes: number
  }
}

export type AnnouncementImpression = {
  date: string
  title: string
  views: number
  likes: number
  lastViewed?: string
  lastLiked?: string
}

/** Firestore document id for this player's private impression. Slashes are not allowed in ids. */
const impressionDocId = (uid: string, announcementId: string) =>
  `${uid}_${announcementId.replaceAll('/', '_')}`

const currentUid = () => {
  try {
    return getAuth().currentUser?.uid ?? null
  } catch {
    return null
  }
}

export const useAnnouncements = async () => {
  // Store which announcements have been dismissed in localStorage
  const dismissedAnnouncements = useLocalStorage<string[]>('hanafuda-dismissed-announcements', [])
  const dontShowAnnouncements = useLocalStorage<boolean>('hanafuda-dont-show-announcements', false)
  const likedAnnouncements = useLocalStorage<string[]>('hanafuda-liked-announcements', [])

  // Fetch announcements from Nuxt Content with locale support
  const { queryAllLocaleDocuments } = useLocaleContent()
  const { data: contentAnnouncements } = await useAsyncData('announcements', () =>
    queryAllLocaleDocuments('announcements'),
  )

  // Impression tracking state - now synced with Firestore
  const impressions = ref<Record<string, AnnouncementImpression>>({})

  // Load this player's impressions. Other players' records are not readable.
  const loadImpressionsFromFirestore = async () => {
    const uid = currentUid()
    if (!uid) return

    try {
      const db = getFirestore()
      const impressionsQuery = query(
        collection(db, 'announcement_impressions'),
        where('uid', '==', uid),
      )
      const snapshot = await getDocs(impressionsQuery)

      const firestoreImpressions: Record<string, AnnouncementImpression> = {}
      snapshot.forEach((entry) => {
        const data = entry.data()
        const announcementId =
          typeof data.announcementId === 'string' ? data.announcementId : entry.id
        firestoreImpressions[announcementId] = {
          title: announcementId,
          date: '',
          views: data.views || 0,
          likes: data.liked ? 1 : 0,
        }
      })

      impressions.value = firestoreImpressions
    } catch (error) {
      console.warn('Failed to load announcement impressions:', error)
      // Continue with local state if Firestore fails
    }
  }

  const saveImpression = async (announcementId: string, liked: boolean, recordView: boolean) => {
    const uid = currentUid()
    if (!uid) return

    const db = getFirestore()
    const impressionRef = doc(db, 'announcement_impressions', impressionDocId(uid, announcementId))
    const existing = await getDoc(impressionRef)
    const views = existing.exists() ? Number(existing.data().views ?? 0) : 0

    if (existing.exists()) {
      await updateDoc(impressionRef, {
        views: recordView ? views + 1 : views,
        liked,
        updatedAt: Timestamp.now(),
      })
      return
    }

    await setDoc(impressionRef, {
      uid,
      announcementId,
      views: recordView ? 1 : 0,
      liked,
      updatedAt: Timestamp.now(),
    })
  }

  // Initialize impressions from Firestore
  await loadImpressionsFromFirestore()

  // Transform content announcements to match our interface
  const announcements = computed(() => {
    if (!contentAnnouncements.value) return []

    return contentAnnouncements.value
      .map((announcement) => ({
        id: btoa(
          String.fromCharCode(
            ...new TextEncoder().encode(`${announcement.date}::${announcement.stem}`),
          ),
        ),
        title: announcement.title,
        description: announcement.description,
        date: announcement.date,
        features: announcement.features || [],
        body: announcement.body || announcement,
        impressions: impressions.value[announcement.id] || { views: 0, likes: 0 },
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date DESC
  })

  // Get announcements that haven't been dismissed
  const newAnnouncements = computed(() => {
    if (dontShowAnnouncements.value) return []

    const now = Date.now()
    return announcements.value.filter((announcement) => {
      const announcementDate = new Date(announcement.date).getTime()
      // Calculate expiresAt as 2 weeks (14 days) after the date
      const expiresAt = announcementDate + 14 * 24 * 60 * 60 * 1000

      return (
        now >= announcementDate &&
        now < expiresAt &&
        !dismissedAnnouncements.value.includes(announcement.id)
      )
    })
  })

  // Check if there are new announcements to show
  const hasNewAnnouncements = computed(() => newAnnouncements.value.length > 0)

  // Count of new announcements for badge display
  const newAnnouncementCount = computed(() => newAnnouncements.value.length)

  // Firestore impression tracking functions
  const trackView = async (announcementId: string) => {
    try {
      // Use nextTick to prevent reactive loops during template rendering
      await nextTick()

      // Update local state immediately for responsive UI
      if (!impressions.value[announcementId]) {
        const [date, title] = new TextDecoder()
          .decode(new Uint8Array([...atob(announcementId)].map((c) => c.charCodeAt(0))))
          .split('::')
        impressions.value[announcementId] = {
          date: String(date),
          title: String(title),
          views: 0,
          likes: 0,
        }
      }
      impressions.value[announcementId].views++
      impressions.value[announcementId].lastViewed = new Date().toISOString()

      await saveImpression(announcementId, likedAnnouncements.value.includes(announcementId), true)
    } catch (error) {
      console.warn('Failed to track announcement view:', error)
      // Don't throw error - continue with local tracking only
    }
  }

  const trackLike = async (announcementId: string) => {
    try {
      const wasLiked = likedAnnouncements.value.includes(announcementId)

      // Use nextTick to prevent reactive loops
      await nextTick()

      // Update local state immediately for responsive UI
      if (!impressions.value[announcementId]) {
        const [date, title] = new TextDecoder()
          .decode(new Uint8Array([...atob(announcementId)].map((c) => c.charCodeAt(0))))
          .split('::')
        impressions.value[announcementId] = {
          date: String(date),
          title: String(title),
          views: 0,
          likes: 0,
        }
      }

      if (wasLiked) {
        // Unlike
        impressions.value[announcementId].likes--
        likedAnnouncements.value = likedAnnouncements.value.filter((id) => id !== announcementId)
      } else {
        // Like
        impressions.value[announcementId].likes++
        impressions.value[announcementId].lastLiked = new Date().toISOString()
        likedAnnouncements.value.push(announcementId)
      }

      await saveImpression(announcementId, !wasLiked, false)

      return !wasLiked // Return new like state
    } catch (error) {
      console.warn('Failed to track announcement like:', error)
      // Don't throw error - continue with local tracking only
      return false
    }
  }

  const isLiked = (announcementId: string) => {
    return likedAnnouncements.value.includes(announcementId)
  }

  // Mark all new announcements as read
  const markAllAsRead = () => {
    const newIds = newAnnouncements.value.map((a) => a.id)
    dismissedAnnouncements.value = [...dismissedAnnouncements.value, ...newIds]
  }

  // Mark a single announcement as read
  const markAsRead = (id: string) => {
    if (!dismissedAnnouncements.value.includes(id)) {
      dismissedAnnouncements.value = [...dismissedAnnouncements.value, id]
    }
  }

  // Permanently disable announcement notifications
  const dontShowAnnouncementsAgain = () => {
    dontShowAnnouncements.value = true
  }

  // Reset announcement preferences (useful for testing or user preference reset)
  const resetAnnouncementPreferences = () => {
    dismissedAnnouncements.value = []
    dontShowAnnouncements.value = false
    likedAnnouncements.value = []
  }

  return {
    announcements,
    newAnnouncements,
    hasNewAnnouncements,
    newAnnouncementCount,
    markAllAsRead,
    markAsRead,
    dontShowAnnouncementsAgain,
    dontShowAnnouncements,
    resetAnnouncementPreferences,
    trackView,
    trackLike,
    isLiked,
    impressions,
  }
}
