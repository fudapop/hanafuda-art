<template>
  <!-- HEADER -->
  <div class="px-4 py-5 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-600 sm:px-6">
    <div class="flex flex-wrap items-end justify-between -mt-2 -ml-4 sm:flex-nowrap">
      <HeadlessDialogTitle as="h3" class="text-xl font-semibold leading-6 tracking-wide text-gray-900 dark:text-white">
        <div class="flex items-center w-full gap-2">
          <span v-if="final.result === 'Win'"> YOU WIN! </span>
          <span v-else-if="final.result === 'Lose'"> YOU LOSE... </span>
          <span v-else> DRAW </span>
          <span class="ml-4 text-2xl text-gray-500 dark:text-gray-300">
          <NumberAnimation
            ref="number1"
            :from="0"
            :to="final.score"
            :format="(value: number) => `+ ${value.toFixed(0)}`"
            :duration="1"
            autoplay
            easing="linear"
          />
            <img src="/images/coin.webp" alt="coin" class="inline w-5 h-5 mb-1 ml-1 drop-shadow-sm" />
          </span>
        </div>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div v-show="ds.gameOver">
        <Button :action="() => $emit('close')"> Close </Button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->

  <HeadlessDisclosure v-for="result in results" v-slot="{ open }">
    <HeadlessDisclosureButton
      :class="`flex w-full justify-between my-1 rounded-md ${result.winner === 'p1' ? 'text-green-900 bg-green-400' : !result.winner ? 'text-indigo-900 bg-indigo-100' : 'text-red-900 bg-red-300'
        } px-4 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 dark:focus-visible:ring-gray-100 focus-visible:ring-opacity-75`">
      <span>Round {{ result.round }}:
        <span v-if="result.winner" class="font-semibold tracking-wide uppercase"> {{ result.winner === 'p1' ? 'Win' : "Lose" }} </span>
        <span v-else class="font-semibold tracking-wide uppercase"> Draw </span>
      </span>
      <span class="float-right font-semibold">{{ result.score }} points</span>
      <ChevronUpIcon :class="open ? '' : 'rotate-180 transform'" class="w-5 h-5 text-gray-500" />
    </HeadlessDisclosureButton>
    <HeadlessDisclosurePanel class="px-4 pt-4 pb-2 text-sm text-gray-500 dark:text-gray-300">
      <YakuGrid v-if="result.winner" :winner="result.winner" :completed="(result.completedYaku as CompletedYaku[])"
        :show-cards="true" />
    </HeadlessDisclosurePanel>
  </HeadlessDisclosure>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from "@heroicons/vue/20/solid";
import { type RoundResult, useGameDataStore } from "~/stores/gameDataStore";
import { type CompletedYaku } from "~/utils/yaku";
import NumberAnimation from "vue-number-animation";

const { results } = defineProps<{
  results: RoundResult[];
}>();

defineEmits(["close"]);

const ds = useGameDataStore();

const final = computed(() => {
  let result;
  const [p1Score, p2Score] = [ds.scoreboard.p1, ds.scoreboard.p2];
  if (p1Score === p2Score) {
    result = "Draw";
  } else if (p1Score > p2Score) {
    result = "Win";
  } else {
    result = "Lose";
  }
  return {
    result,
    score: p1Score,
  };
});
</script>
