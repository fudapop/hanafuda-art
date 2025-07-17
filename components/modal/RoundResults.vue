<template>
  <!-- HEADER -->
  <div
    class="px-4 py-5 border-b bg-surface border-border dark:bg-surface dark:border-border sm:px-6"
  >
    <div class="grid grid-cols-[1fr_max-content] items-end -mt-2 -ml-4">
      <HeadlessDialogTitle
        as="h3"
        class="mb-2 text-base font-semibold leading-6 sm:text-lg text-text dark:text-text"
      >
        <span v-if="recordedWinner">
          <span v-if="decisionIsPending">
            <span v-if="recordedWinner === 'p1'"> Make your call... </span>
            <span v-else> Your opponent is deciding... </span>
          </span>

          <span v-if="!decisionIsPending">
            {{ recordedWinner === 'p1' ? 'You' : 'Your opponent' }}
          </span>
          <span v-if="teshiOrKuttsuki">
            got dealt a
            <a
              title="Four-of-a-Kind / Four-Pairs"
              class="underline decoration-dotted underline-offset-4 cursor-help"
            >
              Lucky Hand </a
            >!
            <a
              href="https://fudawiki.org/en/hanafuda/games/koi-koi#checking-for-lucky-hands"
              title="Read about this rule on fudawiki.org"
              target="_blank"
            >
              <QuestionMarkCircleIcon
                class="inline w-5 h-5 mb-1 cursor-pointer text-text-secondary dark:text-text-secondary hover:text-primary dark:hover:text-accent"
              />
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
        <div
          v-show="players.p1.isActive"
          class="flex justify-end flex-shrink-0 gap-2 ml-4"
        >
          <button
            class="sec-btn"
            @click="callStop"
          >
            STOP
          </button>
          <button
            v-show="handNotEmpty(activePlayer.id)"
            class="pri-btn"
            @click="callKoikoi"
          >
            KOI-KOI
          </button>
        </div>
      </div>
      <div
        v-show="stopIsCalled"
        class="flex justify-end flex-shrink-0 gap-2 ml-4"
      >
        <button
          class="pri-btn"
          @click="() => $emit('next')"
        >
          NEXT
        </button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->
  <h4 class="my-4 text-text-secondary dark:text-text-secondary">
    Total:
    <span class="text-base font-semibold sm:text-lg text-text"
      >{{ lastRoundResult.score }} points</span
    >
    <span
      v-if="lastRoundResult.score && bonusMultiplier > 1"
      class="max-sm:block sm:ml-8"
    >
      Koi-Koi Bonus:
      <span class="text-lg font-semibold text-text">x{{ bonusMultiplier }}</span>
    </span>
  </h4>
  <YakuGrid
    v-if="recordedWinner"
    :winner="recordedWinner"
    :completed="completed"
    :show-cards="true"
  />
</template>

<script setup lang="ts">
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { useCardStore } from '~/stores/cardStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore } from '~/stores/playerStore'
import { type CompletedYaku } from '~/utils/yaku'

defineEmits(['next'])

const { decisionIsPending, callKoikoi, callStop, stopIsCalled } = useDecisionHandler()

const { handNotEmpty } = storeToRefs(useCardStore())

const { activePlayer, bonusMultiplier, players } = storeToRefs(usePlayerStore())

const lastRoundResult = computed(() => useGameDataStore().getCurrent.result)

const completed = computed(() => lastRoundResult.value?.completedYaku as CompletedYaku[])

const teshiOrKuttsuki = computed(() =>
  completed.value.find((yaku) => yaku.name === 'teshi' || yaku.name === 'kuttsuki'),
)

const recordedWinner = computed(() => lastRoundResult.value?.winner)
</script>
