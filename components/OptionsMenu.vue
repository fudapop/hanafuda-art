<template>
  <HeadlessPopover class="relative inline-block text-left">
    <div>
      <HeadlessPopoverButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-lg bg-gray-50/20 dark:bg-gray-700/50 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-50 shadow-sm ring-1 ring-inset ring-gray-300/10 dark:ring-gray-500/10 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <span class="sr-only"> Options </span>
        <AdjustmentsHorizontalIcon
          class="w-8 h-8 text-gray-700 dark:text-gray-400"
          aria-hidden="true"
        />
      </HeadlessPopoverButton>
    </div>
    <HeadlessPopoverOverlay class="fixed inset-0 z-40 bg-black opacity-50" />
    <HeadlessPopoverPanel
      :unmount="false"
      class="absolute top-0 right-0 z-50 w-[calc(100vw-4rem)] sm:w-[600px] h-max mt-2 ml-8 origin-top-right bg-white dark:bg-gray-800 rounded-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none"
    >
      <!-- Close indicator; not a button -->
      <div class="absolute right-0 pointer-events-none -left-8 top-2">
        <div class="relative text-gray-400">
          <span class="absolute -inset-2.5" />
          <span class="sr-only">Close panel</span>
          <XMarkIcon class="w-6 h-6" aria-hidden="true" />
        </div>
      </div>

      <HeadlessTabGroup>
        <HeadlessTabList
          class="flex p-1 space-x-1 rounded-lg shadow-inner bg-blue-900/20 dark:bg-blue-300/20"
        >
          <HeadlessTab
            v-for="category in tabCategories"
            as="template"
            :key="category"
            v-slot="{ selected }"
          >
            <button
              :class="[
                'w-full rounded-lg py-2 text-sm font-medium leading-5 text-blue-700 dark:text-gray-200',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 dark:ring-offset-gray-200 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white dark:bg-gray-800 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
              ]"
            >
              {{ category }}
            </button>
          </HeadlessTab>
        </HeadlessTabList>
        <HeadlessTabPanels>
          <HeadlessTabPanel
            :unmount="false"
            class="w-full min-h-[75svh] relative"
            v-for="(category, index) in tabCategories"
          >
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
