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
const { data: attributions } = useAsyncData(() =>
  queryCollection('policies').where('title', '=', 'Attributions').first(),
)
</script>
