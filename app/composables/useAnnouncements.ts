import { useLocalStorage } from '@vueuse/core'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

export interface Announcement {
  id: string
  title: string
  description: string
  date: string
  features: string[]
  // Content body from markdown
  body?: any
  // Impression tracking
  impressions?: {
    views: number
    likes: number
  }
}

export interface AnnouncementImpression {
  date: string
  title: string
  views: number
  likes: number
  lastViewed?: string
  lastLiked?: string
}

export const useAnnouncements = async () => {
  // Store which announcements have been dismissed in localStorage
  const dismissedAnnouncements = useLocalStorage<string[]>('hanafuda-dismissed-announcements', [])
  const dontShowAnnouncements = useLocalStorage<boolean>('hanafuda-dont-show-announcements', false)
  const likedAnnouncements = useLocalStorage<string[]>('hanafuda-liked-announcements', [])

  // Get current user for authentication checks
  const user = useCurrentUser()

  // Fetch announcements from Nuxt Content with locale support
  const { queryAllLocaleDocuments } = useLocaleContent()
  const { data: contentAnnouncements } = await useAsyncData('announcements', () =>
    queryAllLocaleDocuments('announcements'),
  )

  // Impression tracking state - now synced with Firestore
  const impressions = ref<Record<string, AnnouncementImpression>>({})

  // Load impressions from Firestore on initialization
  const loadImpressionsFromFirestore = async () => {
    try {
      const db = getFirestore()
      const impressionsQuery = query(
        collection(db, 'announcement_impressions'),
        orderBy('lastUpdated', 'desc'),
      )
      const snapshot = await getDocs(impressionsQuery)

      const firestoreImpressions: Record<string, AnnouncementImpression> = {}
      snapshot.forEach((doc) => {
        const data = doc.data()
        firestoreImpressions[doc.id] = {
          title: data.title,
          date: data.date,
          views: data.views || 0,
          likes: data.likes || 0,
          lastViewed: data.lastViewed?.toDate?.()?.toISOString() || data.lastViewed,
          lastLiked: data.lastLiked?.toDate?.()?.toISOString() || data.lastLiked,
        }
      })

      impressions.value = firestoreImpressions
    } catch (error) {
      console.warn('Failed to load announcement impressions:', error)
      // Continue with local state if Firestore fails
    }
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

  // Modal visibility state
  const isAnnouncementModalOpen = ref(false)

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

      // Update Firestore
      const db = getFirestore()
      const impressionRef = doc(db, 'announcement_impressions', announcementId)

      // Check if document exists
      const docSnap = await getDoc(impressionRef)

      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(impressionRef, {
          views: increment(1),
          lastViewed: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        })
      } else {
        // Create new document
        const [date, title] = new TextDecoder()
          .decode(new Uint8Array([...atob(announcementId)].map((c) => c.charCodeAt(0))))
          .split('::')
        await setDoc(impressionRef, {
          title,
          date,
          views: 1,
          likes: 0,
          lastViewed: Timestamp.now(),
          lastUpdated: Timestamp.now(),
          createdAt: Timestamp.now(),
        })
      }
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

      // Update Firestore
      const db = getFirestore()
      const impressionRef = doc(db, 'announcement_impressions', announcementId)

      // Check if document exists
      const docSnap = await getDoc(impressionRef)

      if (docSnap.exists()) {
        // Update existing document
        const updateData: any = {
          likes: increment(wasLiked ? -1 : 1),
          lastUpdated: Timestamp.now(),
        }

        if (!wasLiked) {
          updateData.lastLiked = Timestamp.now()
        }

        await updateDoc(impressionRef, updateData)
      } else {
        // Create new document
        const [date, title] = new TextDecoder()
          .decode(new Uint8Array([...atob(announcementId)].map((c) => c.charCodeAt(0))))
          .split('::')
        await setDoc(impressionRef, {
          announcementId,
          title,
          date,
          views: 0,
          likes: wasLiked ? 0 : 1,
          lastLiked: wasLiked ? null : Timestamp.now(),
          lastUpdated: Timestamp.now(),
          createdAt: Timestamp.now(),
        })
      }

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

  // Show the modal if there are new announcements
  const checkAndShowAnnouncements = () => {
    if (hasNewAnnouncements.value) {
      isAnnouncementModalOpen.value = true
      // Track view for all new announcements
      newAnnouncements.value.forEach((announcement) => {
        trackView(announcement.id)
      })
    }
  }

  // Close the modal and mark current announcements as dismissed
  const dismissAnnouncements = () => {
    // Store the announcement IDs before closing the modal
    const newIds = newAnnouncements.value.map((a) => a.id)

    // Close the modal first
    isAnnouncementModalOpen.value = false

    // Delay marking announcements as dismissed to allow modal transition to complete
    setTimeout(() => {
      dismissedAnnouncements.value = [...dismissedAnnouncements.value, ...newIds]
    }, 250) // Slightly longer than the modal's 200ms leave transition
  }

  // Permanently disable announcement notifications
  const dontShowAnnouncementsAgain = () => {
    // Close the modal first
    isAnnouncementModalOpen.value = false

    // Delay setting the preference to allow modal transition to complete
    setTimeout(() => {
      dontShowAnnouncements.value = true
    }, 250) // Slightly longer than the modal's 200ms leave transition
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
    isAnnouncementModalOpen,
    checkAndShowAnnouncements,
    dismissAnnouncements,
    dontShowAnnouncementsAgain,
    resetAnnouncementPreferences,
    trackView,
    trackLike,
    isLiked,
    impressions,
  }
}
