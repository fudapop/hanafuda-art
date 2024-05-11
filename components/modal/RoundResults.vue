<template>
  <!-- HEADER -->
  <div class="px-4 py-5 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-600 sm:px-6">
    <div class="grid grid-cols-[1fr_max-content] items-end -mt-2 -ml-4">
      <HeadlessDialogTitle as="h3" class="mb-2 text-lg font-semibold leading-6 text-gray-900 dark:text-white">
        <span v-if="recordedWinner">
          <span v-if="decisionIsPending">
            <span v-if="recordedWinner === 'p1'">
              Make your call...
            </span>
            <span v-else>
              Your opponent is deciding...
            </span>
          </span>

          <span v-if="!decisionIsPending">
            {{ recordedWinner === 'p1' ? "You" : "Your opponent" }}
          </span>
          <span v-if="teshiOrKuttsuki">
            got dealt a
            <a title="Four-of-a-Kind / Four-Pairs" class="underline decoration-dotted underline-offset-4 cursor-help">
              Lucky Hand
            </a>!
            <a href="https://fudawiki.org/en/hanafuda/games/koi-koi#checking-for-lucky-hands"
              title="Read about this rule on fudawiki.org" target="_blank">
              <QuestionMarkCircleIcon
                class="inline w-5 h-5 mb-1 text-gray-500 cursor-pointer dark:text-gray-300 hover:text-indigo-500 dark:hover:text-yellow-100" />
              <span class="sr-only">Read about this rule on fudawiki.org</span>
            </a>

          </span>
          <span v-else-if="stopIsCalled"> called stop. </span>
        </span>
        <span v-else>The round is a draw.</span>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div v-show="decisionIsPending">
        <div v-show="players.p1.isActive" class="flex justify-end flex-shrink-0 gap-2 ml-4">
          <Button button-class="secondary" :action="callStop"> Stop </Button>
          <Button v-show="handNotEmpty(activePlayer.id)" button-class="primary" :action="callKoikoi">
            Koi-Koi
          </Button>
        </div>
      </div>
      <div v-show="stopIsCalled" class="flex justify-end flex-shrink-0 gap-2 ml-4">
        <Button :action="() => $emit('next')"> Next Round </Button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->
  <h4 class="my-4 text-gray-600 dark:text-gray-400">
    Total:
    <span class="text-lg font-semibold text-indigo-700 dark:text-yellow-100">{{ lastRoundResult.score }} points</span>
    <span v-if="lastRoundResult.score && bonusMultiplier > 1" class="max-sm:block sm:ml-8">
      Koi-Koi Bonus:
      <span class="text-lg font-semibold text-indigo-700 dark:text-yellow-100">x{{ bonusMultiplier }}</span>
    </span>
  </h4>
  <YakuGrid v-if="recordedWinner" :winner="recordedWinner" :completed="completed" :show-cards="true" />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { QuestionMarkCircleIcon } from "@heroicons/vue/24/outline";
import { useCardStore } from "~/stores/cardStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import { usePlayerStore } from "~/stores/playerStore";
import { type CompletedYaku } from "~/utils/yaku";

defineEmits(["next"]);

const { decisionIsPending, callKoikoi, callStop, stopIsCalled } = useDecisionHandler();

const { handNotEmpty } = storeToRefs(useCardStore());

const { activePlayer, bonusMultiplier, players } = storeToRefs(usePlayerStore());

const lastRoundResult = computed(() => useGameDataStore().getCurrent.result);

const completed = computed(() => lastRoundResult.value?.completedYaku as CompletedYaku[]);

const teshiOrKuttsuki = computed(() => completed.value.find(yaku => yaku.name === "teshi" || yaku.name === "kuttsuki"));

const recordedWinner = computed(() => lastRoundResult.value?.winner);
</script>
