<template>
  <button
    class="rounded-lg bg-surface border border-border p-3 hover:bg-background hover:border-primary transition-colors cursor-pointer text-left"
    type="button"
    @click="$emit('click')"
  >
    <div class="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
      <Icon :name="icon" />
      {{ label }}
    </div>
    <div class="text-2xl font-bold text-text mb-2">
      {{ total }}
    </div>

    <!-- Horizontal Stacked Bar Chart -->
    <div class="my-2">
      <BarChart
        :data="chartData"
        :categories="categories"
        :y-axis="['wins', 'losses', 'draws']"
        :height="28"
        :orientation="'horizontal' as any"
        :stacked="true"
        :bar-padding="0"
        :radius="0"
        :x-grid-line="false"
        :y-grid-line="false"
        :hide-x-axis="true"
        :hide-y-axis="true"
        :hide-legend="true"
        :hide-tooltip="true"
      />
    </div>

    <!-- Legend -->
    <div class="flex justify-between text-xs text-text-secondary">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-green-500" />
        {{ wins }}W
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-red-500" />
        {{ losses }}L
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-yellow-500" />
        {{ draws }}D
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
type Props = {
  icon: string
  label: string
  wins: number
  losses: number
  draws: number
}

const props = defineProps<Props>()

defineEmits<{
  click: []
}>()

const total = computed(() => props.wins + props.losses + props.draws)

const chartData = computed(() => [
  {
    record: 'stats',
    wins: props.wins,
    losses: props.losses,
    draws: props.draws,
  },
])

const categories = {
  wins: { name: 'Wins', color: '#22c55e' }, // green-500
  losses: { name: 'Losses', color: '#ef4444' }, // red-500
  draws: { name: 'Draws', color: '#eab308' }, // yellow-500
}
</script>
