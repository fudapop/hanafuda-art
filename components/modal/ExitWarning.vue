<template>
  <Modal :open="open">
    <template #title>
      <span class="text-lg">{{ $t('game.warnings.leavingGame') }}</span>
    </template>
    <template #image>
      <div
        class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 border rounded-full border-border"
      >
        <ExclamationTriangleIcon
          class="w-6 h-6 text-yellow-600"
          aria-hidden="true"
        />
      </div>
    </template>
    <template #description>
      <p class="my-8 text-text">
        {{ $t('game.warnings.gameWillBeForfeited') }}
      </p>
    </template>
    <template #actions>
      <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
        <button
          type="button"
          class="sec-btn"
          @click="$emit('confirm')"
        >
          {{ $t('game.warnings.yesLeaveGame') }}
        </button>
        <button
          type="button"
          class="pri-btn"
          @click="$emit('cancel')"
        >
          {{ $t('game.warnings.noKeepPlaying') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const { open } = defineProps<{ open: boolean }>()

defineEmits(['confirm', 'cancel'])
</script>
