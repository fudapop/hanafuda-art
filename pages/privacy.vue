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
const { data: policy } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Privacy Policy').first(),
)
</script>
