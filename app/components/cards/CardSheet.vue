<template>
  <div class="p-8">
    <div :class="[currentDesign, 'grid grid-cols-4 sm:grid-cols-8 gap-0.5']">
      <CardImage
        v-for="cardName in cardArray"
        :card="cardName"
        :src="cardMap.get(cardName)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type CardName } from '~/utils/cards'

interface Props {
  design?: CardDesign
}
const props = defineProps<Props>()

const { currentDesign, getCardUrlMap, getDesignInfo } = useCardDesign()
const cardMap = computed(() => getCardUrlMap(currentDesign.value))
const cardArray = computed(() => {
  const { arrangement } = getDesignInfo()
  return (arrangement?.orderByName ?? Array.from(cardMap.value.keys())) as CardName[]
})
</script>
