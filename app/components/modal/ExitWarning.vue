<template>
  <Modal :open="open">
    <template #title>
      <span class="text-lg">{{ t('game.warnings.leavingGame') }}</span>
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
      <p class="my-4 text-text">
        {{ t('game.warnings.gameWillBeForfeited') }}
      </p>
    </template>
    <template #actions>
      <div class="flex flex-col gap-3 mt-6 sm:flex-row">
        <!-- Primary/recommended action: Keep playing - Gold accent -->
        <button
          type="button"
          class="flex-1 tracking-wide pri-btn"
          @click="$emit('cancel')"
        >
          {{ t('game.warnings.noKeepPlaying') }}
        </button>
        <!-- Destructive action: Forfeit - Red/danger styling -->
        <button
          type="button"
          class="flex-1 px-4 py-2 text-sm font-medium tracking-wide text-red-500 transition-colors duration-300 border border-red-300 rounded-xs hover:bg-red-50 hover:border-red-400"
          @click="$emit('forfeit')"
        >
          {{ t('game.warnings.yesLeaveGame') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const { open } = defineProps<{
  open: boolean
}>()
const { t } = useI18n()

defineEmits(['forfeit', 'cancel'])
</script>
