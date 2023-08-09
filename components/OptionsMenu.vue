<template>
  <HeadlessMenu as="div" class="relative inline-block text-left">
    <div>
      <HeadlessMenuButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        Options
        <ChevronDownIcon class="w-5 h-5 -mr-1 text-gray-400" aria-hidden="true" />
      </HeadlessMenuButton>
    </div>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <HeadlessMenuItems
        :unmount="false"
        class="absolute right-0 z-20 w-[300px] sm:w-[600px] mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <HeadlessTabGroup>
          <HeadlessTabList class="flex space-x-1 rounded-md bg-blue-900/20 p-1">
            <HeadlessTab
              v-for="category in tabCategories"
              as="template"
              :key="category"
              v-slot="{ selected }"
            >
              <button
                :class="[
                  'w-full rounded-lg py-2 text-sm font-medium leading-5 text-blue-700',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow'
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
      </HeadlessMenuItems>
    </Transition>
  </HeadlessMenu>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/20/solid";

const { tabCategories } = defineProps<{
  tabCategories: string[];
}>();
</script>
