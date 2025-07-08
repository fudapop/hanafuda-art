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
const { data: policy } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Privacy Policy').first(),
)
</script>
