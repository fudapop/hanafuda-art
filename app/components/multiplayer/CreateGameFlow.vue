<template>
  <div class="create-game-flow">
    <!-- Loading State -->
    <div
      v-if="state === 'creating'"
      class="flex flex-col items-center gap-4 py-8"
    >
      <div
        class="w-12 h-12 border-4 rounded-full border-hanafuda-red border-t-transparent animate-spin"
      />
      <p class="text-sm text-text-secondary">
        {{ t('multiplayer.creating_game') }}
      </p>
    </div>

    <!-- Waiting for Opponent State -->
    <div
      v-else-if="state === 'waiting'"
      class="flex flex-col items-center gap-6 py-6"
    >
      <p class="text-sm text-text-secondary">
        {{ t('multiplayer.share_code_message') }}
      </p>

      <!-- Invite Code Display -->
      <div class="flex flex-col items-center gap-3">
        <label class="text-xs font-medium tracking-wide uppercase text-text-secondary">
          {{ t('multiplayer.invite_code') }}
        </label>
        <div class="flex items-center gap-3">
          <div
            class="px-6 py-3 font-mono text-2xl font-bold tracking-wider rounded-lg bg-hanafuda-cream dark:bg-hanafuda-brown/20 text-hanafuda-red"
          >
            {{ inviteCode }}
          </div>
          <button
            class="px-4 py-3 text-sm font-medium transition-colors rounded-lg bg-hanafuda-red text-hanafuda-cream hover:bg-hanafuda-red/90 active:scale-95"
            @click="copyCode"
          >
            {{ copied ? t('multiplayer.copied') : t('multiplayer.copy') }}
          </button>
        </div>
      </div>

      <!-- Waiting Animation -->
      <div class="flex items-center gap-2 text-sm text-text-secondary">
        <div class="flex gap-1">
          <span
            v-for="i in 3"
            :key="i"
            class="w-2 h-2 rounded-full bg-hanafuda-red animate-pulse"
            :style="{ animationDelay: `${i * 200}ms` }"
          />
        </div>
        <span>{{ t('multiplayer.waiting_for_opponent') }}</span>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 mt-4">
        <button
          class="px-6 py-2 text-sm font-medium transition-colors border rounded-lg border-text-secondary/30 text-text-secondary hover:bg-hanafuda-brown/10 active:scale-95"
          @click="handleCancel"
        >
          {{ t('multiplayer.cancel_game') }}
        </button>
      </div>
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
      <button
        class="px-6 py-2 text-sm font-medium transition-colors rounded-lg bg-hanafuda-red text-hanafuda-cream hover:bg-hanafuda-red/90 active:scale-95"
        @click="retry"
      >
        {{ t('multiplayer.try_again') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMultiplayerMatch } from '~/composables/useMultiplayerMatch'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'close': []
  'game-started': [gameId: string]
}>()

const { t } = useI18n()
const { syncMultiplayerGame, initializeSync } = useStoreManager()
const state = ref<'idle' | 'creating' | 'waiting' | 'error'>('idle')
const inviteCode = ref('')
const gameId = ref('')
const errorMessage = ref('')
const copied = ref(false)
const unsubscribe = ref<(() => void) | null>(null)

const { createGame, cancelGame, subscribeToGame } = useMultiplayerMatch()

const handleCreateGame = async () => {
  state.value = 'creating'
  errorMessage.value = ''

  try {
    const result = await createGame()
    gameId.value = result.gameId
    inviteCode.value = result.code
    state.value = 'waiting'

    // Subscribe to game updates
    unsubscribe.value = subscribeToGame(result.gameId, async (game) => {
      if (game.status === 'active' && game.p2 !== '') {
        // Opponent has joined!
        if (unsubscribe.value) {
          unsubscribe.value()
        }

        // Ensure host's local multiplayer save is synced with the latest remote state
        try {
          initializeSync()
          await syncMultiplayerGame(game.gameId)
        } catch (error) {
          console.error('Failed to sync multiplayer game for host after opponent joined:', error)
        }

        emit('game-started', game.gameId)
      }
    })
  } catch (error) {
    console.error('Error creating game:', error)
    state.value = 'error'
    errorMessage.value =
      error instanceof Error ? error.message : t('multiplayer.error_creating_game')
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Error copying code:', error)
  }
}

const handleCancel = async () => {
  if (!gameId.value) return

  try {
    const success = await cancelGame(gameId.value)
    if (success) {
      if (unsubscribe.value) {
        unsubscribe.value()
      }
      emit('close')
    }
  } catch (error) {
    console.error('Error cancelling game:', error)
  }
}

const retry = () => {
  state.value = 'idle'
  handleCreateGame()
}

onMounted(() => {
  // Auto-create game when component becomes visible
  watch(
    () => props.open,
    async (isOpen) => {
      if (isOpen && state.value === 'idle') {
        await handleCreateGame()
      }
    },
    { immediate: true },
  )
})

// Cleanup on unmount
onUnmounted(() => {
  if (unsubscribe.value) {
    unsubscribe.value()
  }
})
</script>
