<template>
  <HeadlessRadioGroup v-model="selectedOption">
    <HeadlessRadioGroupLabel
      class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-200"
    >
      <slot name="group-label" />
    </HeadlessRadioGroupLabel>
    <HeadlessRadioGroupDescription class="text-sm text-gray-500 dark:text-gray-300">
      <slot name="group-description" />
    </HeadlessRadioGroupDescription>

    <div :class="className || 'grid grid-cols-1 mt-2 mb-4 gap-y-3 sm:grid-cols-3 sm:gap-x-4'">
      <HeadlessRadioGroupOption
        as="template"
        v-for="(option, index) in valueOptions"
        :key="`${option}_${index}`"
        :value="option"
        v-slot="{ active, checked }"
      >
        <div
          :class="[
            active
              ? 'border-indigo-600 dark:border-yellow-100 ring-2 ring-indigo-600 dark:ring-yellow-100'
              : 'border-gray-300',
            'relative flex cursor-pointer rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm focus:outline-none',
          ]"
        >
          <span class="flex flex-1">
            <span class="flex flex-col">
              <HeadlessRadioGroupLabel
                as="span"
                class="block text-sm font-medium text-gray-900 capitalize dark:text-white"
              >
                {{ labelTemplate ? labelTemplate(option) : option }}
              </HeadlessRadioGroupLabel>
              <HeadlessRadioGroupDescription
                v-if="descriptionTemplate"
                as="span"
                class="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-300"
              >
                {{ descriptionTemplate(option) }}
              </HeadlessRadioGroupDescription>
              <HeadlessRadioGroupDescription
                v-else-if="optionDescriptions"
                as="span"
                class="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-300"
              >
                {{ optionDescriptions[index] }}
              </HeadlessRadioGroupDescription>
            </span>
          </span>
          <CheckCircleIcon
            :class="[!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600 dark:text-yellow-300']"
            aria-hidden="true"
          />
          <span
            :class="[
              active ? 'border' : 'border-2',
              checked ? 'border-indigo-600 dark:border-yellow-300' : 'border-transparent',
              'pointer-events-none absolute -inset-px rounded-lg',
            ]"
            aria-hidden="true"
          />
        </div>
      </HeadlessRadioGroupOption>
    </div>
  </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/20/solid'

type ModelVal = string | number | boolean | Record<string, any> | undefined

const { modelValue, updateCallback, valueOptions, labelTemplate, optionDescriptions, className } =
  defineProps<{
    modelValue: ModelVal
    valueOptions: ModelVal[] | readonly ModelVal[]
    updateCallback: (param: ModelVal) => void
    className?: string
    optionDescriptions?: string[]
    labelTemplate?: (param: ModelVal) => string
    descriptionTemplate?: (param: ModelVal) => string
  }>()

const selectedOption = ref(modelValue)
watch(selectedOption, () => updateCallback(selectedOption.value))
</script>
