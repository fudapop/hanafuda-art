import { useLocalStorage } from '@vueuse/core'

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

  // Fetch announcements from Nuxt Content
  const { data: contentAnnouncements } = await useAsyncData('announcements', () =>
    queryCollection('announcements').order('date', 'DESC').all(),
  )

  // Impression tracking state - simplified for now
  const impressions = ref<Record<string, AnnouncementImpression>>({})

  // Transform content announcements to match our interface
  const announcements = computed(() => {
    if (!contentAnnouncements.value) return []

    return contentAnnouncements.value.map((announcement: any) => ({
      id: announcement._path || announcement.title.toLowerCase().replace(/\s+/g, '-'),
      title: announcement.title,
      description: announcement.description,
      date: announcement.date,
      features: announcement.features || [],
      body: announcement.body || announcement,
      impressions: impressions.value[announcement.id] || { views: 0, likes: 0 },
    }))
  })

  // Get announcements that haven't been dismissed
  const newAnnouncements = computed(() => {
    if (dontShowAnnouncements.value) return []

    return announcements.value.filter(
      (announcement) => !dismissedAnnouncements.value.includes(announcement.id),
    )
  })

  // Check if there are new announcements to show
  const hasNewAnnouncements = computed(() => newAnnouncements.value.length > 0)

  // Modal visibility state
  const isAnnouncementModalOpen = ref(false)

  // Basic impression tracking functions (Firestore integration can be added later)
  const trackView = (announcementId: string) => {
    try {
      // Use nextTick to prevent reactive loops during template rendering
      nextTick(() => {
        // Update local state
        if (!impressions.value[announcementId]) {
          impressions.value[announcementId] = { views: 0, likes: 0 }
        }
        impressions.value[announcementId].views++
        impressions.value[announcementId].lastViewed = new Date().toISOString()

        // TODO: Add Firestore integration here when ready
        console.log(`Tracked view for announcement: ${announcementId}`)
      })
    } catch (error) {
      console.warn('Failed to track announcement view:', error)
    }
  }

  const trackLike = (announcementId: string) => {
    try {
      const wasLiked = likedAnnouncements.value.includes(announcementId)

      // Use nextTick to prevent reactive loops
      nextTick(() => {
        // Update local state
        if (!impressions.value[announcementId]) {
          impressions.value[announcementId] = { views: 0, likes: 0 }
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

        // TODO: Add Firestore integration here when ready
        console.log(`Tracked ${wasLiked ? 'unlike' : 'like'} for announcement: ${announcementId}`)
      })

      return !wasLiked // Return new like state
    } catch (error) {
      console.warn('Failed to track announcement like:', error)
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
    isAnnouncementModalOpen.value = false
    const newIds = newAnnouncements.value.map((a) => a.id)
    dismissedAnnouncements.value = [...dismissedAnnouncements.value, ...newIds]
  }

  // Permanently disable announcement notifications
  const dontShowAnnouncementsAgain = () => {
    isAnnouncementModalOpen.value = false
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
