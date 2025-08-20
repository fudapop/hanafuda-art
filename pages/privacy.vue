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
const { t } = useI18n()
const pageTitle = computed(() => `${t('game.title')} | ${t('pages.privacy')}`)
const pageDescription = computed(() => t('pageDescriptions.privacy', { appName: t('game.title') }))

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
})

const { queryLocaleDocument } = useLocaleContent()

const { data: policy } = await useAsyncData('privacy-policy', () =>
  queryLocaleDocument('policies', 'stem', 'privacy-policy'),
)
</script>
