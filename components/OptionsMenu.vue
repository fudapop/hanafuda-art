<template>
  <HeadlessPopover class="relative inline-block text-left">
    <div>
      <HeadlessPopoverButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-gray-50/50 dark:bg-gray-700/50 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500/50 hover:bg-gray-50 dark:hover:bg-gray-600">
        <span class="sr-only">
          Options
        </span>
        <AdjustmentsHorizontalIcon class="w-8 h-8 text-gray-400" aria-hidden="true" />
      </HeadlessPopoverButton>
    </div>
    <HeadlessPopoverOverlay class="fixed inset-0 z-40 bg-black opacity-50" />
      <HeadlessPopoverPanel :unmount="false"
        class="absolute -top-4 right-0 z-50 w-[calc(100vw-2rem)] sm:w-[600px] mt-2 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none">
        <div class="absolute inset-x-0 mx-auto pointer-events-none w-max -bottom-8">
          <div class="relative text-gray-400 rounded-md">
            <span class="absolute -inset-2.5" />
            <span class="sr-only">Close panel</span>
            <XMarkIcon class="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <HeadlessTabGroup>
          <HeadlessTabList class="flex p-1 space-x-1 rounded-md bg-blue-900/20 dark:bg-blue-300/20">
            <HeadlessTab v-for="category in tabCategories" as="template" :key="category" v-slot="{ selected }">
              <button :class="[
                'w-full rounded-lg py-2 text-sm font-medium leading-5 text-blue-700 dark:text-gray-200',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 dark:ring-offset-gray-200 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white dark:bg-gray-800 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
              ]">
                {{ category }}
              </button>
            </HeadlessTab>
          </HeadlessTabList>
          <HeadlessTabPanels>
            <HeadlessTabPanel :unmount="false" class="w-full min-h-[300px] relative" v-for="(category, index) in tabCategories">
              <slot :name="`tab-panel-${index + 1}`" />
            </HeadlessTabPanel>
          </HeadlessTabPanels>
        </HeadlessTabGroup>
      </HeadlessPopoverPanel>
  </HeadlessPopover>
</template>

<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/20/solid";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const { tabCategories } = defineProps<{
  tabCategories: string[];
}>();
</script>
