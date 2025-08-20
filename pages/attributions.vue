<template>
  <ContentLayout>
    <ContentCard>
      <ContentRenderer
        v-if="attributions"
        :value="attributions"
      />
    </ContentCard>
  </ContentLayout>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: {
    mode: 'in-out',
  },
  title: 'New Hanafuda | Artist Attributions',
})

useSeoMeta({
  title: 'New Hanafuda | Artist Attributions',
  description: 'Artist Attributions for New Hanafuda',
  ogTitle: 'New Hanafuda | Artist Attributions',
  ogDescription: 'Artist Attributions for New Hanafuda',
  twitterTitle: 'New Hanafuda | Artist Attributions',
  twitterDescription: 'Artist Attributions for New Hanafuda',
})

const { queryLocaleDocument } = useLocaleContent()

const { data: attributions } = await useAsyncData('attributions', () =>
  queryLocaleDocument('misc', 'stem', 'attributions'),
)
</script>
