<template>
  <!-- HEADER -->
  <div
    class="px-4 py-5 border-b bg-surface border-border dark:bg-surface dark:border-border sm:px-6"
  >
    <div class="flex flex-wrap items-end justify-between -mt-2 -ml-4 sm:flex-nowrap">
      <HeadlessDialogTitle
        as="h3"
        class="text-xl font-semibold leading-6 tracking-wide text-text dark:text-text"
      >
        <div class="flex items-center w-full gap-2">
          <span v-if="final.result === 'Win'">
            {{ t('game.results.youWin') }}
          </span>
          <span v-else-if="final.result === 'Lose'">
            {{ t('game.results.youLose') }}
          </span>
          <span v-else>
            {{ t('game.results.draw') }}
          </span>
          <span class="ml-4 text-2xl text-text-secondary dark:text-text-secondary">
            <NumberAnimation
              ref="number1"
              :from="0"
              :to="final.score"
              :format="(value: number) => `+ ${value.toFixed(0)}`"
              :duration="1"
              autoplay
              easing="linear"
            />
            <img
              src="/images/coin.webp"
              alt="coin"
              class="inline w-5 h-5 mb-1 ml-1 drop-shadow-xs"
            />
          </span>
        </div>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div v-show="ds.gameOver">
        <button
          class="sec-btn"
          @click="() => $emit('close')"
        >
          {{ t('common.actions.close') }}
        </button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->

  <HeadlessDisclosure
    v-for="result in results"
    v-slot="{ open }"
  >
    <HeadlessDisclosureButton
      :class="`flex w-full justify-between my-1 rounded-md ${
        result.winner === 'p1'
          ? 'text-text bg-hanafuda-green'
          : !result.winner
            ? 'text-text bg-surface'
            : 'text-text bg-primary'
      } px-4 py-2 text-left text-sm font-medium focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary dark:focus-visible:ring-accent focus-visible:ring-opacity-75`"
    >
      <span class="capitalize"
        >{{ t('common.labels.round') }} {{ result.round }}:
        <span
          v-if="result.winner"
          class="font-semibold tracking-wide uppercase"
        >
          {{ result.winner === 'p1' ? t('common.labels.win') : t('common.labels.lose') }}
        </span>
        <span
          v-else
          class="font-semibold tracking-wide uppercase"
        >
          {{ t('common.labels.draw') }}
        </span>
      </span>
      <span class="float-right font-semibold"
        >{{ result.score }} {{ t('common.labels.points') }}</span
      >
      <ChevronUpIcon
        :class="open ? '' : 'rotate-180 transform'"
        class="w-5 h-5 text-text-secondary"
      />
    </HeadlessDisclosureButton>
    <HeadlessDisclosurePanel
      class="px-4 pt-4 pb-2 text-sm text-text-secondary dark:text-text-secondary"
    >
      <YakuGrid
        v-if="result.winner"
        :winner="result.winner"
        :completed="result.completedYaku ?? []"
        :show-cards="true"
      />
    </HeadlessDisclosurePanel>
  </HeadlessDisclosure>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from '@heroicons/vue/20/solid'
import NumberAnimation from 'vue-number-animation'
import { type RoundResult, useGameDataStore } from '~~/stores/gameDataStore'

const { t } = useI18n()
const { results } = defineProps<{
  results: RoundResult[]
}>()

defineEmits(['close'])

const ds = useGameDataStore()

const final = computed(() => {
  let result: string
  const [p1Score, p2Score] = [ds.scoreboard.p1, ds.scoreboard.p2]
  if (p1Score === p2Score) {
    result = 'Draw'
  } else if (p1Score > p2Score) {
    result = 'Win'
  } else {
    result = 'Lose'
  }
  return {
    result,
    score: p1Score,
  }
})
</script>
