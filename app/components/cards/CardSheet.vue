<template>
  <div class="p-8">
    <div :class="[currentDesign, 'grid grid-cols-4 sm:grid-cols-8 gap-0.5']">
      <CardImage
        v-for="card in cards"
        :card="card[0]"
        :src="card[1]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  design?: CardDesign
}
const props = defineProps<Props>()

const { currentDesign, getCardUrlMap } = useCardDesign()
const cards = computed(() =>
  Array.from(getCardUrlMap(props.design || currentDesign.value).entries()),
)
</script>
