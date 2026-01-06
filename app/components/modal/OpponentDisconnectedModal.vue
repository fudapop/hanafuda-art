<template>
  <Modal :open="open">
    <template #title>
      <span class="text-lg">{{ t('multiplayer.disconnect.title') }}</span>
    </template>
    <template #image>
      <div
        class="flex items-center justify-center w-12 h-12 mx-auto bg-amber-100 border rounded-full border-border dark:bg-amber-900/30"
      >
        <ExclamationTriangleIcon
          class="w-6 h-6 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      </div>
    </template>
    <template #description>
      <div class="my-4 space-y-4">
        <p class="text-text">
          {{ t('multiplayer.disconnect.description') }}
        </p>

        <!-- Opponent message (if provided) -->
        <div
          v-if="opponentMessage"
          class="p-3 border rounded-xs border-border bg-surface/50"
        >
          <p class="text-sm text-text-secondary mb-1">
            {{ t('multiplayer.disconnect.opponentMessage') }}
          </p>
          <p class="text-text italic">"{{ opponentMessage }}"</p>
        </div>

        <!-- Time since disconnect -->
        <div class="text-center">
          <p class="text-sm text-text-secondary">
            {{ t('multiplayer.disconnect.offlineFor') }}
          </p>
          <p class="text-lg font-semibold text-text">
            {{ offlineDuration }}
          </p>
        </div>
      </div>
    </template>
    <template #actions>
      <div class="flex flex-col-reverse gap-3 mt-6 sm:flex-row sm:justify-end">
        <!-- Continue Waiting button -->
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium tracking-wide transition-colors duration-300 border rounded-xs border-border hover:bg-surface/50"
          @click="handleContinueWaiting"
        >
          {{ t('multiplayer.disconnect.continueWaiting') }}
        </button>
        <!-- Claim Victory button -->
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold tracking-wide text-white transition-colors rounded-xs bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleClaimVictory"
          :disabled="isProcessing"
        >
          {{ isProcessing ? t('common.actions.processing') : t('multiplayer.disconnect.claimVictory') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

type Props = {
  open: boolean
  opponentMessage?: string | null
  offlineDuration: string
  isProcessing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  opponentMessage: null,
  isProcessing: false,
})

const emit = defineEmits<{
  claimVictory: []
  continueWaiting: []
}>()

const { t } = useI18n()

const handleClaimVictory = () => {
  emit('claimVictory')
}

const handleContinueWaiting = () => {
  emit('continueWaiting')
}
</script>
