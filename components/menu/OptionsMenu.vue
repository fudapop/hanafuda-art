<template>
  <HeadlessPopover
    class="relative inline-block text-left"
    v-slot="{ open }"
  >
    <div>
      <HeadlessPopoverButton
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md px-2 py-1.5 text-sm bg-surface/50 font-semibold drop-shadow-md ring-1 ring-inset ring-border/50"
      >
        <span class="sr-only"> Options </span>
        <AdjustmentsHorizontalIcon
          class="w-8 h-8 text-white"
          aria-hidden="true"
        />
      </HeadlessPopoverButton>
    </div>
    <HeadlessPopoverOverlay class="fixed inset-0 z-20 bg-black opacity-50" />
    <HeadlessPopoverPanel
      :unmount="false"
      :class="`
      absolute top-0 right-12 z-[100] origin-top-right 
      w-[calc(100vw-4rem)] sm:w-[600px] h-max mt-2 ml-8 
      [@media(max-height:500px)]:right-0 [@media(max-height:500px)]:left-[10%] [@media(max-height:500px)]:m-0 [@media(max-height:500px)]:fixed
      [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-[15%_1fr] [@media(max-height:500px)]:rounded-none 
      [@media(max-height:500px)]:h-full [@media(max-height:500px)]:w-[90%]
      max-xs:rounded-none max-xs:w-full max-xs:h-full max-xs:m-0 max-xs:inset-0 max-xs:fixed 
      bg-surface rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none
      `"
    >
      <!-- Close indicator; not a button -->
      <HeadlessPopoverButton class="absolute z-50 -left-8 top-4 max-xs:hidden">
        <div class="relative flex text-text-secondary gap-x-2">
          <span class="sr-only">Close</span>
          <XMarkIcon
            class="w-6 h-6"
            aria-hidden="true"
          />
        </div>
      </HeadlessPopoverButton>

      <HeadlessTabGroup>
        <HeadlessTabList
          class="relative flex [@media(max-height:500px)]:flex-col [@media(max-height:500px)]:py-4 rounded-t-[inherit] shadow-inner bg-/20"
        >
          <HeadlessTab
            v-for="(category, index) in tabCategories"
            as="template"
            :key="category"
            v-slot="{ selected }"
          >
            <button
              :class="[
                'w-full py-2 text-sm [@media(max-height:500px)]:text-left [@media(max-height:500px)]:pl-4 font-medium leading-5',
                selected
                  ? 'bg-surface text-primary'
                  : 'text-surface/50 hover:text-white bg-hanafuda-brown',
                index === 0
                  ? 'rounded-tl-[inherit]'
                  : index === tabCategories.length - 1
                  ? 'rounded-tr-[inherit]'
                  : '',
              ]"
            >
              {{ category }}
            </button>
          </HeadlessTab>
          <!-- Move signup panel to separate tab for mobile landscape layout -->
          <HeadlessTab
            v-if="isGuest"
            as="template"
            v-slot="{ selected }"
          >
            <button
              :class="[
                'absolute bottom-4 inset-x-1 py-2 [@media(max-height:500px)]:text-left [@media(max-height:500px)]:pl-4 text-sm font-medium leading-5 text-primary [@media(min-height:_500px)]:hidden',
                selected
                  ? 'bg-surface shadow'
                  : 'text-primary/80 hover:bg-white/[0.12] hover:text-white',
              ]"
            >
              SIGN IN
            </button>
          </HeadlessTab>
          <div v-else>
            <div
              :class="[
                'absolute bottom-4 inset-x-1 py-2 pl-4 [@media(max-height:500px)]:text-left text-sm font-medium leading-5 text-primary [@media(min-height:_500px)]:hidden',
              ]"
            >
              SIGN OUT
            </div>
            <LoginButton
              class="absolute z-20 py-2 pl-4 opacity-0 bottom-4 inset-x-1 [@media(min-height:_500px)]:hidden"
            />
          </div>
        </HeadlessTabList>
        <HeadlessTabPanels>
          <HeadlessTabPanel
            :unmount="false"
            class="w-full min-h-[75svh] relative"
            v-for="(category, index) in tabCategories"
          >
            <slot :name="`tab-panel-${index + 1}`" />
          </HeadlessTabPanel>
          <HeadlessTabPanel
            v-if="isGuest"
            :unmount="false"
            class="relative w-full h-full [@media(min-height:_500px)]:hidden"
          >
            <div class="w-[500px] absolute inset-0 h-max m-auto">
              <div class="mx-auto mt-5 text-text w-max">
                <ExclamationCircleIcon class="inline w-6 h-6 ml-3 align-top" />
                <p class="inline ml-2">Sign in is required to save your profile.</p>
                <button
                  class="action-button"
                  @click="gotoLogin"
                >
                  SIGN IN
                </button>
              </div>
            </div>
          </HeadlessTabPanel>
        </HeadlessTabPanels>
      </HeadlessTabGroup>
    </HeadlessPopoverPanel>
    <HeadlessPopoverButton
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-30 h-10 shadow-inner xs:hidden"
    >
      <div
        class="relative flex items-center justify-center w-full h-full text-primary bg-primary/20 gap-x-2"
      >
        <span class="sr-only">Close</span>
        <XMarkIcon
          class="w-6 h-6"
          aria-hidden="true"
        />
      </div>
    </HeadlessPopoverButton>
  </HeadlessPopover>
</template>

<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/20/solid'
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const { tabCategories } = defineProps<{
  tabCategories: string[]
}>()
const isGuest = computed(() => useProfile().current.value?.isGuest)
const gotoLogin = () => {
  navigateTo({ path: '/login', query: { link: 'true' } })
}
</script>
