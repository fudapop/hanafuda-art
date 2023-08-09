<template>
  <HeadlessPopover class="relative inline-block text-left">
    <div>
      <HeadlessPopoverButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500/50 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        Options
        <ChevronDownIcon class="w-5 h-5 -mr-1 text-gray-400" aria-hidden="true" />
      </HeadlessPopoverButton>
    </div>
    <HeadlessPopoverOverlay class="fixed inset-0 bg-black opacity-30" />
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <HeadlessPopoverPanel
        :unmount="false"
        class="absolute -top-4 right-0 z-20 w-[calc(100vw-2rem)] sm:w-[600px] mt-2 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none"
      >
        <div class="absolute -bottom-12 right-0 pointer-events-none">
          <div class="relative rounded-md text-gray-400">
            <span class="absolute -inset-2.5" />
            <span class="sr-only">Close panel</span>
            <XMarkIcon class="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
        <HeadlessTabGroup>
          <HeadlessTabList
            class="flex space-x-1 bg-blue-900/20 dark:bg-blue-300/20 p-1 rounded-md"
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
              class="w-full min-h-[300px] relative"
              v-for="(_, index) in tabCategories"
            >
              <slot :name="`tab-panel-${index + 1}`" />
            </HeadlessTabPanel>
          </HeadlessTabPanels>
        </HeadlessTabGroup>
      </HeadlessPopoverPanel>
    </Transition>
  </HeadlessPopover>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/20/solid";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const { tabCategories } = defineProps<{
  tabCategories: string[];
}>();
</script>
