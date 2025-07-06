import { useLocalStorage } from '@vueuse/core'

export interface Announcement {
  id: string
  title: string
  description: string
  date: string
  features: string[]
  // Content body from markdown
  body?: any
}

export const useAnnouncements = async () => {
  // Store which announcements have been dismissed in localStorage
  const dismissedAnnouncements = useLocalStorage<string[]>('hanafuda-dismissed-announcements', [])
  const dontShowAnnouncements = useLocalStorage<boolean>('hanafuda-dont-show-announcements', false)

  // Fetch announcements from Nuxt Content
  const { data: contentAnnouncements } = await useAsyncData('announcements', () =>
    queryCollection('announcements').order('date', 'DESC').all(),
  )

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

  // Show the modal if there are new announcements
  const checkAndShowAnnouncements = () => {
    if (hasNewAnnouncements.value) {
      isAnnouncementModalOpen.value = true
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
  }

  return {
    announcements: readonly(announcements),
    newAnnouncements: readonly(newAnnouncements),
    hasNewAnnouncements,
    isAnnouncementModalOpen: readonly(isAnnouncementModalOpen),
    checkAndShowAnnouncements,
    dismissAnnouncements,
    dontShowAnnouncementsAgain,
    resetAnnouncementPreferences,
  }
}
