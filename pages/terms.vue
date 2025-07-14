<template>
  <ContentLayout>
    <ContentCard>
      <ContentRenderer
        v-if="terms"
        :value="terms"
      />
    </ContentCard>
  </ContentLayout>
</template>

<script setup lang="ts">
definePageMeta({
  pageTransition: {
    mode: 'in-out',
  },
  title: 'New Hanafuda | Terms of Use',
})

useSeoMeta({
  title: 'New Hanafuda | Terms of Use',
  description: 'Terms of Use for New Hanafuda',
  ogTitle: 'New Hanafuda | Terms of Use',
  ogDescription: 'Terms of Use for New Hanafuda',
  twitterTitle: 'New Hanafuda | Terms of Use',
  twitterDescription: 'Terms of Use for New Hanafuda',
})

const { data: terms } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Terms of Use').first(),
)
</script>
