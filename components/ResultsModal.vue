<template>
  <HeadlessDialog :open="show" class="relative z-10">
    <HeadlessTransitionRoot appear :show="show" unmount>
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
      <div class="fixed inset-0 overflow-y-auto">
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
              class="p-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-md shadow-xl w-[clamp(320px,calc(100vw-2rem),800px)]"
            >
              <slot />
            </div>
          </HeadlessTransitionChild>
        </div>
      </div>
    </HeadlessTransitionRoot>
  </HeadlessDialog>
</template>

<script setup lang="ts">
const { show } = defineProps<{ show: boolean }>();
</script>
