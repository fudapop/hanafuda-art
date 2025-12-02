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

/**
 * Computed status text to display
 */
const statusText = computed(() => {
  const { state, lastSeen } = props.presence

  if (state === 'playing') {
    return t('multiplayer.opponent_playing')
  }

  if (state === 'online') {
    return t('multiplayer.opponent_online')
  }

  if (state === 'offline' && lastSeen) {
    return formatLastSeen(lastSeen)
  }

  return t('multiplayer.opponent_offline')
})

/**
 * Computed title for the status indicator (tooltip)
 */
const statusTitle = computed(() => {
  const { state } = props.presence

  if (state === 'playing') {
    return t('multiplayer.opponent_playing')
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

  if (state === 'playing') {
    return 'bg-blue-500 animate-pulse'
  }

  if (state === 'online') {
    return 'bg-green-500 animate-pulse'
  }

  return 'bg-gray-400'
})

/**
 * Computed text color class based on state
 */
const textColorClass = computed(() => {
  const { state } = props.presence

  if (state === 'playing') {
    return 'text-blue-600 dark:text-blue-400'
  }

  if (state === 'online') {
    return 'text-green-600 dark:text-green-400'
  }

  return 'text-gray-600 dark:text-gray-400'
})
</script>
