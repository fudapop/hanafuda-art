<template>
  <div class="relative inline-block text-left">
    <!-- Trigger Button -->
    <button
      v-show="gameIsStarted"
      class="game-ui-btn"
      @click="toggleOptions"
    >
      <span class="sr-only">Options</span>
      <EllipsisVertical
        class="size-4 text-white"
        aria-hidden="true"
      />
    </button>

    <!-- Modal -->
    <HeadlessTransitionRoot
      as="template"
      :show="isOpenGlobal"
    >
      <HeadlessDialog
        :unmount="false"
        as="div"
        class="relative z-10"
        @close="closeOptions"
      >
        <div class="fixed inset-0" />

        <div class="fixed inset-0 overflow-hidden">
          <div class="absolute inset-0 overflow-hidden">
            <div class="fixed inset-y-0 right-0 flex max-w-full pointer-events-none sm:pl-16">
              <HeadlessTransitionChild
                as="template"
                enter="transition-transform ease-in-out duration-500 sm:duration-700"
                enter-from="translate-x-full"
                enter-to="translate-x-0"
                leave="transition-transform duration-500 sm:duration-700"
                leave-from="translate-x-0"
                leave-to="translate-x-full"
              >
                <HeadlessDialogPanel
                  :unmount="false"
                  class="w-screen h-dvh max-w-2xl pointer-events-auto"
                >
                  <div
                    class="flex flex-col h-full border-l shadow-xl bg-hanafuda-brown border-border"
                  >
                    <HeadlessDialogTitle class="sr-only">
                      {{ t('menu.options.title') }}
                    </HeadlessDialogTitle>

                    <div class="flex-1 min-h-0">
                      <div class="flex flex-col h-full">
                        <!-- Tab content -->
                        <div class="flex-1 min-h-0 overflow-hidden bg-surface pb-12">
                          <div
                            v-for="(tab, index) in tabs"
                            :key="tab"
                            :class="[
                              'h-full overflow-y-auto touch-pan-y',
                              currentTabIndex === index ? 'block' : 'hidden',
                            ]"
                          >
                            <slot :name="`tab-panel-${index + 1}`" />
                          </div>
                        </div>

                        <!-- Simple tab navigation -->
                        <Teleport to="body">
                          <HeadlessTransitionChild
                            as="template"
                            enter="transition-transform ease-in-out duration-500 sm:duration-700"
                            enter-from="translate-x-full"
                            enter-to="translate-x-0"
                            leave="transition-transform duration-500 sm:duration-700"
                            leave-from="translate-x-0"
                            leave-to="translate-x-full"
                          >
                            <div
                              class="cursor-pointer fixed bottom-0 right-0 w-full max-w-2xl flex shrink-0 bg-transparent z-100 rounded-t-md overflow-hidden"
                            >
                              <button
                                v-for="(tab, index) in tabs"
                                :key="tab"
                                :class="[
                                  'flex items-center justify-center gap-2 w-full py-4 px-4 text-sm font-medium leading-5 transition-colors',
                                  'border-r text-white',
                                  currentTabIndex === index
                                    ? 'bg-hanafuda-brown border-t rounded-t-md'
                                    : 'text-white/80 hover:text-white hover:bg-hanafuda-brown/80 bg-black/50 backdrop-blur-xs',
                                  currentTabIndex === index + 1 && 'rounded-tr-md',
                                  currentTabIndex === index - 1 && 'rounded-tl-md',
                                ]"
                                @click="() => openOptions(tab)"
                              >
                                <slot :name="`tab-icon-${index + 1}`">
                                  <!-- Fallback content if no icon slot is provided -->
                                </slot>
                                <span class="capitalize sr-only sm:not-sr-only">{{
                                  t(`menu.options.tabs.${tab}`)
                                }}</span>
                              </button>
                              <button
                                type="button"
                                :class="[
                                  'bg-black/50 hover:bg-hanafuda-brown backdrop-blur-xs py-4 px-6 text-white/80 hover:text-white',
                                  'focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                  currentTabIndex === tabs.length - 1 && 'rounded-tl-md',
                                ]"
                                @click="closeOptions"
                              >
                                <span class="sr-only">{{ t('common.actions.close') }}</span>
                                <XMarkIcon
                                  class="w-6 h-6"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </HeadlessTransitionChild>
                        </Teleport>
                      </div>
                    </div>
                  </div>
                </HeadlessDialogPanel>
              </HeadlessTransitionChild>
            </div>
          </div>
        </div>
      </HeadlessDialog>
    </HeadlessTransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { EllipsisVertical } from 'lucide-vue-next'
import { type GameOptionsTab } from '~/composables/useOptionsPanel'

const { tabs } = defineProps<{
  tabs: GameOptionsTab[]
}>()

const { t } = useI18n()

// Global options modal state
const {
  isOpen: isOpenGlobal,
  openOptions,
  closeOptions,
  toggleOptions,
  currentTabIndex,
} = useOptionsPanel()
const gameIsStarted = useState('start')
</script>
