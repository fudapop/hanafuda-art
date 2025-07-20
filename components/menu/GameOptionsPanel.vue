<template>
  <div class="relative inline-block text-left">
    <!-- Trigger Button -->
    <button
      v-show="gameIsStarted"
      class="game-ui-btn"
      @click="toggleOptions"
    >
      <span class="sr-only">Options</span>
      <Icon
        name="heroicons:ellipsis-vertical"
        class="w-5 h-5 text-white"
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
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enter-from="translate-x-full"
                enter-to="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leave-from="translate-x-0"
                leave-to="translate-x-full"
              >
                <HeadlessDialogPanel
                  :unmount="false"
                  class="w-screen h-[100dvh] max-w-2xl pointer-events-auto"
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
                        <div class="flex-1 min-h-0 overflow-hidden bg-surface">
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
                        <div class="flex flex-shrink-0">
                          <button
                            v-for="(tab, index) in tabs"
                            :key="tab"
                            :class="{
                              'flex items-center justify-center gap-2 w-full py-4 px-4 text-sm font-medium leading-5 transition-colors': true,
                              'border-r border-surface': true,
                              'bg-accent/20 text-primary bg-surface': currentTabIndex === index,
                              'text-surface hover:text-white hover:bg-accent/10 border-t':
                                currentTabIndex !== index,
                            }"
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
                            class="p-4 border-t border-t-surface text-surface hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            @click="closeOptions"
                          >
                            <span class="sr-only">{{ t('common.actions.close') }}</span>
                            <XMarkIcon
                              class="w-6 h-6"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
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
