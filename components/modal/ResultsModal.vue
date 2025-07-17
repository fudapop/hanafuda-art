<template>
  <HeadlessDialog
    :open="show"
    class="relative z-10"
  >
    <HeadlessTransitionRoot
      appear
      :show="show && !isOptionsOpen"
      unmount
    >
      <!-- BACKDROP -->
      <HeadlessTransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25 pointer-events-none" />
      </HeadlessTransitionChild>

      <!-- PANEL -->
      <div
        v-if="!modalHidden && !isOptionsOpen"
        class="fixed inset-0 overflow-y-auto transition-opacity duration-300"
      >
        <div class="flex items-center justify-center min-h-full p-4 text-center">
          <HeadlessTransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <!-- RESPONSIVE CONTAINER -->
            <div
              class="p-6 overflow-hidden text-left align-middle transition-all transform text-text dark:text-text bg-surface dark:bg-surface rounded-md shadow-xl w-[clamp(320px,calc(100vw-2rem),800px)]"
            >
              <div ref="slotRef">
                <slot />
              </div>
            </div>
          </HeadlessTransitionChild>
        </div>
      </div>
    </HeadlessTransitionRoot>
    <Teleport to="body">
      <div
        v-show="!isOptionsOpen"
        class="absolute inset-x-0 z-50 mx-auto w-max text-white bottom-[5%] flex flex-col items-center sm:flex-row sm:justify-center gap-2"
      >
        <button
          class="w-48 game-ui-btn place-content-center"
          @click="() => openOptions('Yaku List')"
        >
          <span class="mr-1">
            <Icon
              class="inline w-8 h-8 pb-1"
              name="mdi:cards-outline"
            />
            Open Yaku List
          </span>
        </button>
        <button
          class="w-48 game-ui-btn place-content-center"
          @click="toggleModal"
        >
          <span :class="['mr-1', modalHidden && 'animate-pulse']">
            <EyeSlashIcon
              class="inline w-8 h-8 pb-1"
              v-if="modalHidden"
            />
            <EyeIcon
              class="inline w-8 h-8 pb-1"
              v-else
            />
            Show Board
          </span>
        </button>
      </div>
    </Teleport>
  </HeadlessDialog>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
const { show } = defineProps<{ show: boolean }>()
const modalHidden = ref(false)

const { openOptions, isOpen: isOptionsOpen } = useOptionsPanel()

const toggleModal = () => {
  modalHidden.value = !modalHidden.value
}
</script>
