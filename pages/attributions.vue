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
  title: 'New Hanafuda | Attributions',
})
const { data: attributions } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Attributions').first(),
)
</script>
