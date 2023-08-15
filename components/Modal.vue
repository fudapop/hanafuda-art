<template>
  <HeadlessTransitionRoot as="template" :show="open">
    <HeadlessDialog as="div" class="relative z-10">
      <HeadlessTransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
      </HeadlessTransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div
          class="flex items-end justify-center min-h-full p-4 text-center sm:items-center sm:p-0"
        >
          <HeadlessTransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <HeadlessDialogPanel
              class="relative px-4 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
            >
              <div>
                <slot name="image" />

                <div class="mt-3 text-center sm:mt-5">
                  <HeadlessDialogTitle
                    as="h3"
                    class="text-base font-semibold leading-6 text-gray-900"
                  >
                    <slot name="title" />
                  </HeadlessDialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      <slot name="description" />
                    </p>
                  </div>
                </div>
              </div>
              <slot name="actions" />
            </HeadlessDialogPanel>
          </HeadlessTransitionChild>
        </div>
      </div>
    </HeadlessDialog>
  </HeadlessTransitionRoot>
</template>

<script setup lang="ts">
const { open } = defineProps<{ open: boolean }>();
</script>
