<template>
  <div class="flex flex-col gap-1 text-sm">
    <div class="flex items-center gap-2">
      <!-- Status indicator dot -->
      <div
        :class="['w-2 h-2 rounded-full transition-colors duration-300', dotColorClass]"
        :title="statusTitle"
      />

      <!-- Status text -->
      <span
        v-if="showText"
        :class="['font-medium transition-colors duration-300', textColorClass]"
      >
        {{ statusText }}
      </span>

      <!-- Reconnecting spinner for offline state -->
      <svg
        v-if="presence.state === 'offline'"
        class="w-3 h-3 animate-spin text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>

    <!-- Opponent message (if present) -->
    <p
      v-if="presence.message"
      class="text-xs italic text-text-secondary/80 max-w-xs truncate"
      :title="presence.message"
    >
      "{{ presence.message }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import type { PresenceState } from '~~/types/profile'

type Props = {
  /**
   * The opponent's presence state
   */
  presence: PresenceState

  /**
   * Whether to show status text alongside the dot indicator
   * @default true
   */
  showText?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showText: true,
})

const { t } = useI18n()
const { formatLastSeen } = usePresence()
const { isReplaying } = useOpponentReplay()

/**
 * Computed status text to display
 */
const statusText = computed(() => {
  const { state, lastSeen } = props.presence

  // During replay, always show "Playing..." regardless of presence state
  // (the opponent may have already updated their presence to 'online')
  if (isReplaying.value) {
    return t('multiplayer.opponent_playing')
  }

  if (state === 'playing') {
    return t('multiplayer.opponent_thinking')
  }

  if (state === 'online') {
    return t('multiplayer.opponent_online')
  }

  // Show "Reconnecting..." for offline state to indicate we're waiting for them
  if (state === 'offline') {
    return t('multiplayer.disconnect.reconnecting')
  }

  return t('multiplayer.opponent_offline')
})

/**
 * Computed title for the status indicator (tooltip)
 */
const statusTitle = computed(() => {
  const { state } = props.presence

  if (isReplaying.value) {
    return t('multiplayer.opponent_playing')
  }

  if (state === 'playing') {
    return t('multiplayer.opponent_thinking')
  }

  if (state === 'online') {
    return t('multiplayer.opponent_online')
  }

  return t('multiplayer.opponent_offline')
})

/**
 * Computed dot color class based on state
 */
const dotColorClass = computed(() => {
  const { state } = props.presence

  if (isReplaying.value) {
    return 'bg-blue-500 animate-pulse'
  }

  if (state === 'playing') {
    return 'bg-indigo-400 animate-pulse'
  }

  if (state === 'online') {
    return 'bg-green-500 animate-pulse'
  }

  // Amber pulsing dot for offline/reconnecting state
  if (state === 'offline') {
    return 'bg-amber-500 animate-pulse'
  }

  return 'bg-gray-400'
})

/**
 * Computed text color class based on state
 */
const textColorClass = computed(() => {
  const { state } = props.presence

  if (isReplaying.value) {
    return 'text-blue-400'
  }

  if (state === 'playing') {
    return 'text-indigo-400'
  }

  if (state === 'online') {
    return 'text-green-400'
  }

  // Amber text for offline/reconnecting state
  if (state === 'offline') {
    return 'text-amber-400'
  }

  return 'text-gray-400'
})
</script>
