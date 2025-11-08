<template>
  <Modal
    :open="open"
    ref="modalRef"
  >
    <template #title>
      <span
        class="flex flex-col gap-y-1 items-center justify-center sm:flex-row sm:justify-between"
      >
        {{ title }}
        <span
          v-if="dateRange"
          class="text-xs font-normal text-text-secondary"
        >
          {{ dateRange }}
        </span>
      </span>
    </template>
    <template #description>
      <div class="space-y-6 text-left px-2">
        <!-- Donut Chart -->
        <div class="flex justify-center relative">
          <DonutChart
            hide-legend
            :data="data"
            :categories="categories"
            :height="260"
            :radius="80"
            :arc-width="20"
            :pad-angle="0.05"
          />
          <div
            v-if="centerData?.name && centerData?.value"
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div class="text-sm text-text-secondary">{{ centerData!.name }}</div>
            <div class="text-2xl font-bold text-text">{{ centerData!.value }}</div>
          </div>
        </div>

        <!-- Legend slot for custom legend content -->
        <slot name="legend" />
      </div>
    </template>
    <template #actions>
      <div class="flex justify-self-end mt-6">
        <button
          class="action-button"
          @click="$emit('close')"
        >
          {{ closeLabel || t('common.actions.close') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type Props = {
  open: boolean
  title: string
  data: number[]
  categories: Record<string, { name: string; color: string }>
  closeLabel?: string
  centerData?: { name: string; value: string }
  startDate?: Date
  endDate?: Date
}

const { t, locale } = useI18n()

const { closeLabel, centerData, startDate, endDate = new Date() } = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const modalRef = ref<HTMLDivElement | null>(null)
onClickOutside(modalRef, () => {
  emit('close')
})

const dateRange = computed(() => {
  if (!startDate || !endDate) return null
  return `${startDate.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })}`
})
</script>

<style>
:root {
  --vis-donut-background-color: transparent;
}

/* Hide tooltip from charts */
[data-vis-xy-container] svg,
[data-vis-single-container] svg {
  pointer-events: none;
}
</style>
