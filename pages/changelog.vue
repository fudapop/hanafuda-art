<template>
  <ContentLayout>
    <ContentCard>
      <ContentRenderer
        v-if="changelog"
        :value="changelog"
      />
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

const { queryLocaleDocument } = useLocaleContent()

const { data: changelog } = await useAsyncData('changelog', () =>
  queryLocaleDocument('misc', 'stem', 'changelog'),
)
</script>
