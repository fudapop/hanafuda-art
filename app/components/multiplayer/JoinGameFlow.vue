<template>
  <div class="join-game-flow">
    <!-- Input State -->
    <div
      v-if="state === 'input'"
      class="flex flex-col gap-6 py-6"
    >
      <p class="text-sm text-text-secondary">
        {{ t('multiplayer.enter_code_message') }}
      </p>

      <!-- Code Input -->
      <div class="flex flex-col gap-2">
        <label
          for="invite-code"
          class="text-xs font-medium tracking-wide uppercase text-text-secondary"
        >
          {{ t('multiplayer.invite_code') }}
        </label>
        <input
          id="invite-code"
          v-model="inviteCode"
          type="text"
          :placeholder="t('multiplayer.code_placeholder')"
          class="px-4 py-3 font-mono text-xl tracking-wider text-center uppercase transition-colors border-2 rounded-lg outline-none bg-hanafuda-cream dark:bg-hanafuda-brown/20 border-text-secondary/30 text-text placeholder:text-text-secondary/50 focus:border-hanafuda-red"
          maxlength="7"
          @input="formatCodeInput"
          @keyup.enter="handleJoin"
        />
        <p
          v-if="validationError"
          class="text-xs text-hanafuda-red"
        >
          {{ validationError }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          class="flex-1 px-6 py-2 text-sm font-medium transition-colors border rounded-lg border-text-secondary/30 text-text-secondary hover:bg-hanafuda-brown/10 active:scale-95"
          @click="emit('close')"
        >
          {{ t('common.actions.cancel') }}
        </button>
        <button
          class="flex-1 px-6 py-2 text-sm font-medium transition-colors rounded-lg bg-hanafuda-red text-hanafuda-cream hover:bg-hanafuda-red/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!inviteCode || inviteCode.length < 6"
          @click="handleJoin"
        >
          {{ t('multiplayer.join') }}
        </button>
      </div>
    </div>

    <!-- Validating State -->
    <div
      v-else-if="state === 'validating'"
      class="flex flex-col items-center gap-4 py-8"
    >
      <div
        class="w-12 h-12 border-4 rounded-full border-hanafuda-red border-t-transparent animate-spin"
      />
      <p class="text-sm text-text-secondary">
        {{ t('multiplayer.validating_code') }}
      </p>
    </div>

    <!-- Joining State -->
    <div
      v-else-if="state === 'joining'"
      class="flex flex-col items-center gap-4 py-8"
    >
      <div
        class="w-12 h-12 border-4 rounded-full border-hanafuda-red border-t-transparent animate-spin"
      />
      <p class="text-sm text-text-secondary">
        {{ t('multiplayer.joining_game') }}
      </p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-center gap-4 py-8"
    >
      <div class="p-4 rounded-full bg-hanafuda-red/10">
        <svg
          class="w-8 h-8 text-hanafuda-red"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <p class="text-sm text-center text-text-secondary">
        {{ errorMessage }}
      </p>
      <div class="flex gap-3">
        <button
          class="px-6 py-2 text-sm font-medium transition-colors border rounded-lg border-text-secondary/30 text-text-secondary hover:bg-hanafuda-brown/10 active:scale-95"
          @click="backToInput"
        >
          {{ t('common.actions.back') }}
        </button>
        <button
          class="px-6 py-2 text-sm font-medium transition-colors rounded-lg bg-hanafuda-red text-hanafuda-cream hover:bg-hanafuda-red/90 active:scale-95"
          @click="retry"
        >
          {{ t('multiplayer.try_again') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMultiplayerMatch } from '~/composables/useMultiplayerMatch'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'close': []
  'game-joined': [gameId: string]
}>()

const { t } = useI18n()
const state = ref<'input' | 'validating' | 'joining' | 'error'>('input')
const inviteCode = ref('')
const errorMessage = ref('')
const validationError = ref('')

const { joinGame, validateInviteCode } = useMultiplayerMatch()

const formatCodeInput = () => {
  // Remove any non-alphanumeric characters except dash
  let value = inviteCode.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')

  // Remove existing dashes for reformatting
  value = value.replace(/-/g, '')

  // Add dash after 3 characters
  if (value.length > 3) {
    value = `${value.slice(0, 3)}-${value.slice(3, 6)}`
  }

  inviteCode.value = value
  validationError.value = ''
}

const handleJoin = async () => {
  if (!inviteCode.value || inviteCode.value.length < 6) return

  // Clear previous errors
  errorMessage.value = ''
  validationError.value = ''

  // Validate code first
  state.value = 'validating'

  try {
    const validation = await validateInviteCode(inviteCode.value)

    if (!validation.valid) {
      state.value = 'error'
      errorMessage.value = validation.error || t('multiplayer.invalid_code')
      return
    }

    // Code is valid, proceed to join
    state.value = 'joining'

    const result = await joinGame(inviteCode.value)

    if (result.success) {
      // Successfully joined!
      emit('game-joined', result.gameId)
    } else {
      state.value = 'error'
      errorMessage.value = t('multiplayer.join_failed')
    }
  } catch (error) {
    console.error('Error joining game:', error)
    state.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : t('multiplayer.join_failed')
  }
}

const backToInput = () => {
  state.value = 'input'
  errorMessage.value = ''
}

const retry = () => {
  handleJoin()
}
</script>
