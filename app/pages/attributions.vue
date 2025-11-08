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
const { t } = useI18n()
const pageTitle = computed(() => `${t('game.title')} | ${t('pages.attributions')}`)
const pageDescription = computed(() =>
  t('pageDescriptions.attributions', { appName: t('game.title') }),
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

const { data: attributions } = await useAsyncData('attributions', () =>
  queryLocaleDocument('misc', 'stem', 'attributions'),
)
</script>
