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
      <p class="text-sm text-gray-500 dark:text-gray-300">
        The game will be forfeited and progress will not be saved. Are you sure you want
        to leave?
      </p>
    </template>
    <template #actions>
      <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
        <button type="button" class="sec-btn" @click="$emit('confirm')">
          Yes, leave the game
        </button>
        <button type="button" class="pri-btn" @click="$emit('cancel')">
          No, keep playing
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
