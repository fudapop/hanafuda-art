<template>
  <ContentLayout>
    <ContentCard>
      <ContentRenderer
        v-if="policy"
        :value="policy"
      />
    </ContentCard>
  </ContentLayout>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: {
    mode: 'in-out',
  },
  title: 'New Hanafuda | Privacy Policy',
})

useSeoMeta({
  title: 'New Hanafuda | Privacy Policy',
  description: 'Privacy Policy for New Hanafuda',
  ogTitle: 'New Hanafuda | Privacy Policy',
  ogDescription: 'Privacy Policy for New Hanafuda',
  twitterTitle: 'New Hanafuda | Privacy Policy',
  twitterDescription: 'Privacy Policy for New Hanafuda',
})

const { data: policy } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Privacy Policy').first(),
)
</script>
