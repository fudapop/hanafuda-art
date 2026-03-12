<template>
  <div class="px-4 py-8 text-center">
    <h1 class="text-3xl font-bold tracking-wide text-text sm:text-4xl">
      <span v-if="outcome === 'win'">{{ t('game.results.youWin') }}</span>
      <span v-else-if="outcome === 'lose'">{{ t('game.results.youLose') }}</span>
      <span v-else>{{ t('game.results.draw') }}</span>
    </h1>
    <div class="mt-3 text-2xl text-text-secondary">
      <NumberAnimation
        :from="0"
        :to="score"
        :format="(value: number) => `+ ${value.toFixed(0)}`"
        :duration="1"
        autoplay
        easing="linear"
      />
      <img
        src="/images/coin.webp"
        alt="coin"
        class="inline w-6 h-6 mb-1 ml-1 drop-shadow-xs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NumberAnimation from 'vue-number-animation'

const { t } = useI18n()

defineProps<{
  outcome: 'win' | 'lose' | 'draw'
  score: number
}>()
</script>
