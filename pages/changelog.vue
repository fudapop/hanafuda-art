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
const { data: terms } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Terms of Use').first(),
)
</script>
