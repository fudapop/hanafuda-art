<template>
  <HeadlessDialog
    :open="show"
    class="relative z-10"
  >
    <HeadlessTransitionRoot
      appear
      :show="show"
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
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </HeadlessTransitionChild>

      <!-- PANEL -->
      <div
        ref="dialogRef"
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
              class="p-6 overflow-hidden text-left align-middle transition-all transform text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md shadow-xl w-[clamp(320px,calc(100vw-2rem),800px)]"
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
      <div class="absolute inset-x-0 z-50 mx-auto w-max text-white bottom-[5%]">
        <Button
          button-class="primary"
          :action="toggleOpacity"
        >
          <span class="mr-1 animate-pulse">
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
        </Button>
      </div>
    </Teleport>
  </HeadlessDialog>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
const { show } = defineProps<{ show: boolean }>()
const dialogRef: Ref<HTMLElement | null> = ref(null)
const modalHidden = ref(false)

const toggleOpacity = () => {
  modalHidden.value = !modalHidden.value
  dialogRef?.value?.classList.toggle('opacity-0')
}
</script>
