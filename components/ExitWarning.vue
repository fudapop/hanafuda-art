<template>
  <Modal :open="open">
    <template #title> Leaving the game... </template>
    <template #image>
      <div
        class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full"
      >
        <ExclamationTriangleIcon class="w-6 h-6 text-yellow-600" aria-hidden="true" />
      </div>
    </template>
    <template #description>
      The game will be forfeited and progress will not be saved. Are you sure you want to
      leave?
    </template>
    <template #actions>
      <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="button"
          class="inline-flex justify-center w-full px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
          @click="$emit('cancel')"
        >
          No, keep playing
        </button>
        <button
          type="button"
          class="inline-flex justify-center w-full px-3 py-2 mt-3 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
          @click="$emit('confirm')"
          ref="cancelButtonRef"
        >
          Yes, leave the game
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

const { open } = defineProps<{ open: boolean }>();

defineEmits(["confirm", "cancel"]);
</script>
