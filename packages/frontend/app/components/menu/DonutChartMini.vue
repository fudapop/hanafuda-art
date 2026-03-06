<template>
  <DonutChart
    :hide-legend="hideLegend"
    :data="data"
    :categories="categories"
    :height="height ?? 50"
    :radius="radius ?? 20"
    :arc-width="arcWidth ?? 6"
    :pad-angle="padAngle ?? 0.02"
  />
</template>

<script setup lang="ts">
type Props = {
  data: number[]
  categories: Record<string, { name: string; color: string }>
  height?: number
  radius?: number
  arcWidth?: number
  padAngle?: number
  hideLegend?: boolean
}
const { data, categories, hideLegend = true } = defineProps<Props>()
</script>
