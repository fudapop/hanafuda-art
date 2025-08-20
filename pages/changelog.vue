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
const { t } = useI18n()
const pageTitle = computed(() => `${t('game.title')} | ${t('pages.changelog')}`)
const pageDescription = computed(() =>
  t('pageDescriptions.changelog', { appName: t('game.title') }),
)

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
})

const { queryLocaleDocument } = useLocaleContent()

const { data: changelog } = await useAsyncData('changelog', () =>
  queryLocaleDocument('misc', 'stem', 'changelog'),
)
</script>
