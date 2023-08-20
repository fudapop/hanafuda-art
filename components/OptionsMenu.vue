<template>
  <HeadlessPopover class="relative inline-block text-left" v-slot="{ open }">
    <div>
      <HeadlessPopoverButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-lg px-2 py-1.5 text-sm bg-gray-500/20 font-semibold drop-shadow-md ring-1 ring-inset ring-gray-300/50 dark:ring-gray-500/50">
        <span class="sr-only"> Options </span>
        <AdjustmentsHorizontalIcon class="w-8 h-8 text-white" aria-hidden="true" />
      </HeadlessPopoverButton>
    </div>
    <HeadlessPopoverOverlay class="fixed inset-0 z-20 bg-black opacity-50" />
    <HeadlessPopoverPanel :unmount="false" :class="`
      absolute top-0 right-0 z-30 origin-top-right 
      w-[calc(100vw-4rem)] sm:w-[600px] h-max mt-2 ml-8 
      [@media(max-height:500px)]:right-0 [@media(max-height:500px)]:left-[10%] [@media(max-height:500px)]:m-0 [@media(max-height:500px)]:fixed
      [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-[15%_1fr] [@media(max-height:500px)]:rounded-none 
      [@media(max-height:500px)]:h-full [@media(max-height:500px)]:w-[90%]
      max-xs:rounded-none max-xs:w-full max-xs:h-full max-xs:m-0 max-xs:inset-0 max-xs:fixed 
      bg-white dark:bg-gray-800 rounded-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none
      `">
      <!-- Close indicator; not a button -->
      <HeadlessPopoverButton class="absolute z-50 -left-8 top-4 max-xs:hidden">
        <div class="relative flex text-gray-700 dark:text-gray-300 gap-x-2">
          <span class="sr-only">Close</span>
          <XMarkIcon class="w-6 h-6" aria-hidden="true" />
        </div>
      </HeadlessPopoverButton>

      <HeadlessTabGroup>
        <HeadlessTabList
          class="relative flex [@media(max-height:500px)]:flex-col [@media(max-height:500px)]:py-4 p-1 gap-1 rounded-[inherit] shadow-inner bg-blue-900/20 dark:bg-blue-300/20">
          <HeadlessTab v-for="category in tabCategories" as="template" :key="category" v-slot="{ selected }">
            <button :class="[
              'w-full rounded-lg py-2 text-sm [@media(max-height:500px)]:text-left pl-4 font-medium leading-5 text-blue-700 dark:text-gray-200',
              'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 dark:ring-offset-gray-200 focus:outline-none focus:ring-2',
              selected
                ? 'bg-white dark:bg-gray-800 shadow'
                : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
            ]">
              {{ category }}
            </button>
          </HeadlessTab>
          <!-- Move signup panel to separate tab for mobile landscape layout -->
          <HeadlessTab v-if="isGuest" as="template" v-slot="{ selected }">
            <button :class="[
              'absolute bottom-4 inset-x-1 rounded-lg py-2 [@media(max-height:500px)]:text-left pl-4 text-sm font-medium leading-5 text-blue-700 dark:text-gray-200 [@media(min-height:_500px)]:hidden',
              'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 dark:ring-offset-gray-200 focus:outline-none focus:ring-2',
              selected
                ? 'bg-white dark:bg-gray-800 shadow'
                : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
            ]">
              Sign In
            </button>
          </HeadlessTab>
          <div v-else>
            <div :class="[
              'absolute bottom-4 inset-x-1 rounded-lg py-2 pl-4 [@media(max-height:500px)]:text-left text-sm font-medium leading-5 text-blue-700 dark:text-gray-200 [@media(min-height:_500px)]:hidden',
              'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 dark:ring-offset-gray-200 focus:outline-none focus:ring-2',
              'text-blue-100 hover:bg-white/[0.12] hover:text-white',
            ]">
              Logout
            </div>
            <LoginButton class="absolute z-20 py-2 pl-4 opacity-0 bottom-4 inset-x-1 [@media(min-height:_500px)]:hidden" />
          </div>
        </HeadlessTabList>
        <HeadlessTabPanels>
          <HeadlessTabPanel :unmount="false" class="w-full min-h-[75svh] relative"
            v-for="(category, index) in tabCategories">
            <slot :name="`tab-panel-${index + 1}`" />
          </HeadlessTabPanel>
          <HeadlessTabPanel v-if="isGuest" :unmount="false"
            class="relative w-full h-full [@media(min-height:_500px)]:hidden">
            <div class="w-[500px] absolute inset-0 h-max m-auto">
              <SignupPanel />
            </div>
          </HeadlessTabPanel>
        </HeadlessTabPanels>
      </HeadlessTabGroup>
    </HeadlessPopoverPanel>
    <HeadlessPopoverButton v-if="open" class="fixed inset-x-0 bottom-0 z-30 h-10 shadow-inner xs:hidden">
      <div
        class="relative flex items-center justify-center w-full h-full text-blue-700 dark:text-gray-200 bg-blue-900/20 dark:bg-blue-300/20 gap-x-2">
        <span class="sr-only">Close</span>
        <XMarkIcon class="w-6 h-6" aria-hidden="true" />
      </div>
    </HeadlessPopoverButton>
  </HeadlessPopover>
</template>

<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/20/solid";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const { tabCategories } = defineProps<{
  tabCategories: string[];
}>();

const isGuest = computed(() => useProfile().current.value?.isGuest);
</script>
