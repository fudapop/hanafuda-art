<template>
  <div class="flex items-center justify-center gap-6 px-4 py-4 sm:gap-10">
    <div class="text-center">
      <p class="text-sm font-medium tracking-wide uppercase text-text-secondary">
        {{ playerName }}
      </p>
      <p class="text-3xl font-bold text-text sm:text-4xl">
        {{ selfScore }}
      </p>
    </div>
    <span class="text-xl font-semibold text-text-secondary">vs</span>
    <div class="text-center">
      <p class="text-sm font-medium tracking-wide uppercase text-text-secondary">
        {{ opponentName }}
      </p>
      <p class="text-3xl font-bold text-text sm:text-4xl">
        {{ opponentScore }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  playerName: string
  opponentName: string
  selfScore: number
  opponentScore: number
}>()
</script>
