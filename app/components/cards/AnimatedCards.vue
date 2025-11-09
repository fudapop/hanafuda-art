<template>
  <Transition
    mode="out-in"
    enter-to-class="opacity-100"
    enter-from-class="opacity-0 -scale-x-25 motion-reduce:scale-x-100"
    enter-active-class="duration-500"
    leave-to-class="opacity-0"
    leave-from-class="opacity-100"
    leave-active-class="duration-400"
  >
    <div
      v-if="loaded"
      :key="selectedDesign"
      :class="['animated-cards-container', selectedDesign]"
    >
      <div class="drop-shadow-md animated-card card one">
        <CardImage
          card="matsu-ni-tsuru"
          :src="getCardUrl('matsu-ni-tsuru', selectedDesign)!"
        />
      </div>
      <div class="drop-shadow-md animated-card card two">
        <CardImage
          card="sakura-ni-maku"
          :src="getCardUrl('sakura-ni-maku', selectedDesign)!"
        />
      </div>
      <div class="drop-shadow-md animated-card card three">
        <CardImage
          card="susuki-ni-tsuki"
          :src="getCardUrl('susuki-ni-tsuki', selectedDesign)!"
        />
      </div>
      <div class="drop-shadow-md animated-card card four">
        <CardImage
          card="yanagi-ni-ono-no-toufuu"
          :src="getCardUrl('yanagi-ni-ono-no-toufuu', selectedDesign)!"
        />
      </div>
      <div class="drop-shadow-md animated-card card five">
        <CardImage
          card="kiri-ni-ho-oh"
          :src="getCardUrl('kiri-ni-ho-oh', selectedDesign)!"
        />
      </div>
      <p
        v-if="title"
        class="tracking-wide"
      >
        {{ title }}
      </p>
    </div>
    <CardsLoader
      v-else
      :no-text="true"
      :class="[selectedDesign]"
    />
  </Transition>
</template>

<script setup lang="ts">
import { useImage } from '@vueuse/core'
import { type CardName } from '~/utils/cards'
const { getCardUrl, currentDesign: selectedDesign } = useCardDesign()

const loaded = ref(false)

const loadImages = async () => {
  loaded.value = false
  const images = (
    [
      'matsu-ni-tsuru',
      'sakura-ni-maku',
      'susuki-ni-tsuki',
      'yanagi-ni-ono-no-toufuu',
      'kiri-ni-ho-oh',
    ] as CardName[]
  ).map((cardName) => useImage({ src: getCardUrl(cardName, selectedDesign.value)! }))
  while (images.every((img) => img.isLoading.value)) {
    await sleep(500)
  }
  await sleep(1500)
  loaded.value = true
}

const { title } = defineProps<{ title?: string }>()

onMounted(() => {
  loadImages()
  watch(selectedDesign, () => {
    loadImages()
  })
})
</script>
