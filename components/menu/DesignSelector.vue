<template>
  <div
    class="max-h-[calc(100dvh-84px)] [@media(max-height:500px)]:max-h-[100dvh] xs:max-h-[75vh] overflow-y-auto pb-4"
  >
    <DesignRadioGroup />
  </div>
</template>

<script setup lang="ts">
const { useDesign, fetchCardUrls } = useCardDesign()

const currentDesign = useDesign()

const preloadTags = ref()
const preloadHead = useHead({})

const preloadImages = () => {
  fetchCardUrls().then((urlMap) => {
    preloadTags.value = [...urlMap.values()].map((url) => ({
      rel: 'preload',
      href: url,
      as: 'image',
    }))
    preloadHead?.patch({
      link: preloadTags.value,
    })
  })
}

onMounted(() => {
  useHead(
    {
      link: [{ rel: 'preconnect', href: 'https://firebasestorage.googleapis.com' }],
    },
    { tagPriority: 'high' },
  )
  preloadImages()
  watch(currentDesign, preloadImages)
})
</script>
