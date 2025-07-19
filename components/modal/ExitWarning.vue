<template>
  <Modal :open="open">
    <template #title> Leaving the game... </template>
    <template #image>
      <div class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
        <ExclamationTriangleIcon
          class="w-6 h-6 text-yellow-600"
          aria-hidden="true"
        />
      </div>
    </template>
    <template #description>
      <p class="text-sm text-gray-500 dark:text-gray-300">
        What would you like to do with your current game progress?
      </p>
    </template>
    <template #actions>
      <div class="grid grid-flow-row-dense gap-3 mt-6">
        <!-- Save and Exit button -->
        <button
          type="button"
          class="pri-btn"
          :disabled="saving"
          @click="handleSaveAndExit"
        >
          {{ saving ? 'Saving...' : 'Save & Exit' }}
        </button>
        
        <!-- Exit without saving -->
        <button
          type="button"
          class="sec-btn"
          :disabled="saving"
          @click="$emit('confirm', { action: 'discard' })"
        >
          Exit Without Saving
        </button>
        
        <!-- Cancel -->
        <button
          type="button"
          class="outline-btn"
          :disabled="saving"
          @click="$emit('cancel')"
        >
          Keep Playing
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const { open } = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  confirm: [data: { action: 'save' | 'discard' }]
  cancel: []
}>()

const { saveGame, isSupported } = useGamePersistence()
const saving = ref(false)

const handleSaveAndExit = async () => {
  if (!isSupported.value) {
    // Fallback to discard if save not supported
    emit('confirm', { action: 'discard' })
    return
  }

  try {
    saving.value = true
    await saveGame('Game Save')
    emit('confirm', { action: 'save' })
  } catch (error) {
    console.error('Failed to save game:', error)
    // Could show error toast here
    // For now, fallback to asking user what to do
    if (confirm('Failed to save game. Exit without saving?')) {
      emit('confirm', { action: 'discard' })
    } else {
      saving.value = false
    }
  }
}
</script>
