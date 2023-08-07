<template>
  <!-- HEADER -->
  <div class="px-4 py-5 bg-white border-b border-gray-200 sm:px-6">
    <div class="flex flex-wrap items-end justify-between -mt-2 -ml-4 sm:flex-nowrap">
      <HeadlessDialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900">
        {{}}
        <span v-if="finalResult.winner === 'p1'"> YOU WIN! </span>
        <span v-else-if="finalResult.winner === 'p2'"> YOU LOSE... </span>
        <span v-else> DRAW </span>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div v-show="stopIsCalled">
        <Button :action="() => $emit('close')"> Close </Button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->

  <HeadlessDisclosure v-for="result in results" v-slot="{ open }">
    <HeadlessDisclosureButton
      :class="`flex w-full justify-between mb-1 rounded-md ${
        result.winner === 'p1' ? 'bg-green-400' : 'bg-red-400'
      } px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75`"
    >
      <span
        >Round {{ result.round }}:
        <span class="uppercase"> {{ result.winner }} </span></span
      >
      <span class="float-right font-semibold">{{ result.score }} points</span>
      <ChevronUpIcon
        :class="open ? '' : 'rotate-180 transform'"
        class="h-5 w-5 text-gray-500"
      />
    </HeadlessDisclosureButton>
    <HeadlessDisclosurePanel class="px-4 pt-4 pb-2 text-sm text-gray-500">
      <YakuGrid
        v-if="result.winner"
        :winner="result.winner"
        :completed="(result.completedYaku as CompletedYaku[])"
        :show-cards="true"
      />
    </HeadlessDisclosurePanel>
  </HeadlessDisclosure>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from "@heroicons/vue/20/solid";
import { storeToRefs } from "pinia";
import { RoundResult } from "~/stores/gameDataStore";
import { usePlayerStore } from "~/stores/playerStore";
import { CompletedYaku } from "~/utils/yaku";

const { results } = defineProps<{
  results: RoundResult[];
}>();

defineEmits(["close"]);

const { stopIsCalled } = useDecisionHandler();

const { playerList } = storeToRefs(usePlayerStore());

const finalResult = computed(() => {
  const score = Math.max(...playerList.value.map((p) => p.score));
  const winner = score ? playerList.value.find((p) => p.score === score)?.id : null;
  return {
    winner,
    score,
  };
});
</script>
