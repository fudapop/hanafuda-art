<template>
  <ContentLayout>
    <ContentCard>
      <!-- Header with navigation info -->
      <div
        v-if="hasMultipleChangelogs"
        class="flex flex-col items-center justify-between px-4 pb-6 sm:flex-row"
      >
        <div class="flex items-center gap-2">
          <Icon
            name="heroicons:document-text"
            class="w-6 h-6 text-primary"
            aria-hidden
          />
          <h1 class="mb-0 text-lg sm:text-xl">Changelog</h1>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span class="text-sm sm:text-base">{{ currentPage + 1 }} of {{ totalChangelogs }}</span>
        </div>
      </div>

      <!-- Current changelog content -->
      <div class="overflow-y-auto max-h-[70vh] px-4">
        <ContentRenderer
          v-if="currentChangelog"
          :value="currentChangelog"
        />
      </div>

      <!-- Pagination controls -->
      <div
        v-if="hasMultipleChangelogs"
        class="flex items-center justify-between px-4 py-4 mt-6 border-t border-gray-200 dark:border-gray-600"
      >
        <button
          type="button"
          :disabled="currentPage === 0"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
            'focus:outline-none focus-visible:outline-none',
            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
            currentPage === 0
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
          @click="previousChangelog"
        >
          <Icon
            name="heroicons:chevron-left"
            class="w-4 h-4"
          />
          Previous
        </button>

        <!-- Page indicators -->
        <div class="flex gap-2">
          <button
            v-for="(changelog, index) in sortedChangelogs"
            :key="changelog.path"
            type="button"
            :class="[
              'w-2 h-2 rounded-full transition-colors',
              'focus:outline-none focus-visible:outline-none',
              'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
              index === currentPage
                ? 'bg-primary'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500',
            ]"
            :title="`Go to ${changelog.title || `Version ${(changelog as any).version || index + 1}`}`"
            @click="currentPage = index"
          />
        </div>

        <button
          type="button"
          :disabled="currentPage === totalChangelogs - 1"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
            'focus:outline-none focus-visible:outline-none',
            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
            currentPage === totalChangelogs - 1
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
          @click="nextChangelog"
        >
          Next
          <Icon
            name="heroicons:chevron-right"
            class="w-4 h-4"
          />
        </button>
      </div>
    </ContentCard>
  </ContentLayout>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: {
    mode: 'in-out',
  },
  title: 'New Hanafuda | Changelog',
})

useSeoMeta({
  title: 'New Hanafuda | Changelog',
  description: 'Changelog for New Hanafuda',
  ogTitle: 'New Hanafuda | Changelog',
  ogDescription: 'Changelog for New Hanafuda',
  twitterTitle: 'New Hanafuda | Changelog',
  twitterDescription: 'Changelog for New Hanafuda',
})

// Fetch all changelog entries
const { data: allChangelogs } = await useAsyncData('changelog', () =>
  queryCollection('changelog').all(),
)

// Pagination state
const currentPage = ref(0)

// Sort changelogs by publishedAt in descending order (most recent first)
const sortedChangelogs = computed(() => {
  if (!allChangelogs.value || !Array.isArray(allChangelogs.value)) return []
  return [...allChangelogs.value].sort((a: any, b: any) => {
    const dateA = new Date(a.publishedAt || 0).getTime()
    const dateB = new Date(b.publishedAt || 0).getTime()
    return dateB - dateA
  })
})

// Current changelog computed property
const currentChangelog = computed(() => {
  return sortedChangelogs.value[currentPage.value] || null
})

// Navigation methods
const nextChangelog = () => {
  if (sortedChangelogs.value.length > 0 && currentPage.value < sortedChangelogs.value.length - 1) {
    currentPage.value++
  }
}

const previousChangelog = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

// Check if we have multiple changelogs
const hasMultipleChangelogs = computed(() => {
  return sortedChangelogs.value.length > 1
})

// Get total count
const totalChangelogs = computed(() => {
  return sortedChangelogs.value.length
})

// Keyboard navigation
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Only handle keyboard navigation if we're on this page and have multiple changelogs
    if (!hasMultipleChangelogs.value) return

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      previousChangelog()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      nextChangelog()
    }
  }

  document.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>
