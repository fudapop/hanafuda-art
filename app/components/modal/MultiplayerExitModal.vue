<template>
  <Modal :open="open">
    <template #title>
      <span class="text-lg">{{ t('multiplayer.exit.title') }}</span>
    </template>
    <template #image>
      <div
        class="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 border rounded-full border-border dark:bg-blue-900/30"
      >
        <InformationCircleIcon
          class="w-6 h-6 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
      </div>
    </template>
    <template #description>
      <div class="my-4 space-y-4">
        <p class="text-text">
          {{ t('multiplayer.exit.description') }}
        </p>
        <div>
          <label
            for="exit-message"
            class="block text-sm font-medium text-text-secondary mb-2"
          >
            {{ t('multiplayer.exit.messageLabel') }}
            <span class="text-xs text-text-secondary/70 font-normal">
              ({{ t('multiplayer.exit.messageOptional') }})
            </span>
          </label>
          <textarea
            id="exit-message"
            v-model="message"
            :placeholder="t('multiplayer.exit.messagePlaceholder')"
            class="w-full px-3 py-2 text-sm border rounded-xs border-border bg-surface dark:bg-hanafuda-cream text-text focus:outline-none focus:ring-2 focus:ring-hanafuda-green focus:border-transparent resize-none"
            rows="3"
            :maxlength="200"
          />
          <p class="mt-1 text-xs text-text-secondary/70">{{ message.length }}/200</p>
        </div>
      </div>
    </template>
    <template #actions>
      <div class="flex flex-col-reverse gap-3 mt-6 sm:flex-row sm:justify-end">
        <!-- Cancel button -->
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium tracking-wide transition-colors duration-300 border rounded-xs border-border hover:bg-surface/50"
          @click="handleCancel"
        >
          {{ t('common.actions.cancel') }}
        </button>
        <!-- Leave Game button -->
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold tracking-wide text-white transition-colors rounded-xs bg-hanafuda-green hover:bg-hanafuda-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleLeave"
          :disabled="isSaving"
        >
          {{ isSaving ? t('common.actions.saving') : t('multiplayer.exit.leaveGame') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

type Props = {
  open: boolean
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false,
})

const emit = defineEmits<{
  leave: [message: string | null]
  cancel: []
}>()

const { t } = useI18n()
const message = ref('')

const handleLeave = () => {
  const trimmedMessage = message.value.trim() || null
  emit('leave', trimmedMessage)
}

const handleCancel = () => {
  message.value = ''
  emit('cancel')
}

// Reset message when modal closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      message.value = ''
    }
  },
)
</script>
