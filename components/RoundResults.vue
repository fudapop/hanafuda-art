<template>
  <!-- HEADER -->
  <div class="px-4 py-5 bg-white border-b border-gray-200 sm:px-6">
    <div class="flex flex-wrap items-end justify-between -mt-2 -ml-4 sm:flex-nowrap">
      <HeadlessDialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900">
        {{ recordedWinner?.toUpperCase() }}
        <span v-if="decisionIsPending"> is deciding... </span>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div
        v-if="decisionIsPending"
        v-hide:from="'p2'"
        class="flex flex-shrink-0 gap-2 ml-4"
      >
        <Button button-class="secondary" :action="callStop"> Stop </Button>
        <Button
          v-show="handNotEmpty(activePlayer.id)"
          button-class="primary"
          :action="callKoikoi"
        >
          Koi-Koi
        </Button>
      </div>
      <div v-else v-show="stopIsCalled">
        <Button :action="() => $emit('next')"> Next Round </Button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->

  <YakuGrid v-if="recordedWinner" :winner="recordedWinner" :completed="completed" />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCardStore } from "~/stores/cardStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import { usePlayerStore } from "~/stores/playerStore";
import { YakuName } from "~/utils/yaku";

defineEmits(["next"]);

const { decisionIsPending, callKoikoi, callStop, stopIsCalled } = useDecisionHandler();

const { handNotEmpty } = storeToRefs(useCardStore());

const { activePlayer } = storeToRefs(usePlayerStore());

const lastRoundResult = computed(() => useGameDataStore().getCurrent.result);

const completed = computed(() => lastRoundResult.value?.completedYaku as YakuName[]);

const recordedWinner = computed(() => lastRoundResult.value?.winner);
</script>
