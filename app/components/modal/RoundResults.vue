<template>
  <!-- HEADER -->
  <div class="py-5 border-b bg-surface border-border dark:bg-surface dark:border-border">
    <div class="grid grid-cols-[1fr_max-content] items-center">
      <HeadlessDialogTitle
        as="h3"
        class="text-base font-semibold leading-6 lg:text-xl text-text dark:text-text"
      >
        <div class="hidden sm:inline">
          <img
            v-if="recordedWinner === 'p1'"
            :src="p1Avatar"
            alt="p1 avatar"
            class="inline w-16 h-16 mr-4 border rounded-full shadow-xs lg:w-24 lg:h-24 border-border"
          />
          <img
            v-else
            :src="p2Avatar"
            alt="p2 avatar"
            class="inline w-16 h-16 mr-4 border rounded-full shadow-xs lg:w-24 lg:h-24 border-border"
          />
        </div>
        <span v-if="recordedWinner">
          <span v-if="decisionIsPending">
            <span v-if="recordedWinner === 'p1'">
              {{ t('game.actions.makeYourCall') }}
            </span>
            <span v-else>
              {{ t('game.actions.opponentDeciding') }}
            </span>
          </span>
          <span v-if="!decisionIsPending">
            {{ ps.getPlayerName(recordedWinner) }}
          </span>
          <span v-if="teshiOrKuttsuki">
            {{ ` ${t('game.results.gotDealtA')}` }}
            <a
              title="Four-of-a-Kind / Four-Pairs"
              class="underline decoration-dotted underline-offset-4 cursor-help"
            >
              {{ t('game.results.luckyHand') }} </a
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
          <span v-else-if="stopIsCalled">
            {{ ` ${t('game.actions.calledStop')}` }}
          </span>
        </span>
        <span v-else>
          {{ t('game.results.theRoundIsADraw') }}
        </span>
      </HeadlessDialogTitle>

      <!-- BUTTONS -->
      <!-- Warning is logged if no focusable elements rendered -->
      <!-- Hidden during opponent decision -->
      <div v-show="decisionIsPending">
        <div
          v-show="players.p1.isActive"
          class="flex justify-end shrink-0 gap-2 ml-4"
        >
          <button
            class="text-base uppercase lg:text-xl sec-btn"
            @click="callStop"
          >
            {{ t('game.actions.stop') }}
          </button>
          <button
            v-show="handNotEmpty(activePlayer.id)"
            class="text-base uppercase pri-btn lg:text-xl"
            @click="callKoikoi"
          >
            {{ t('game.actions.koikoi') }}
          </button>
        </div>
      </div>
      <div
        v-show="stopIsCalled"
        class="flex justify-end shrink-0 gap-2 my-auto ml-4"
      >
        <button
          class="text-base uppercase pri-btn lg:text-xl"
          @click="() => $emit('next')"
        >
          {{ t('common.actions.next') }}
        </button>
      </div>
    </div>
  </div>
  <!-- END HEADER -->
  <h4 class="my-4 text-text-secondary dark:text-text-secondary">
    {{ t('common.labels.total') }}:
    <span class="text-base font-semibold sm:text-lg text-text"
      >{{ lastRoundResult?.score }} {{ t('common.labels.points') }}</span
    >
    <span
      v-if="lastRoundResult?.score && bonusMultiplier > 1"
      class="max-sm:block sm:ml-8"
    >
      {{ t('game.results.koiKoiBonus') }}:
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
import { type CompletedYaku } from '~/utils/yaku'
import { useCardStore } from '~~/stores/cardStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'

const { t } = useI18n()

defineEmits(['next'])

const { p1Avatar, p2Avatar } = useAvatar()

const { decisionIsPending, callKoikoi, callStop, stopIsCalled } = useDecisionHandler()

const { handNotEmpty } = storeToRefs(useCardStore())

const ps = usePlayerStore()
const { activePlayer, bonusMultiplier, players } = storeToRefs(ps)

const lastRoundResult = computed(() => useGameDataStore().getCurrent.result)

const completed = computed(() => lastRoundResult.value?.completedYaku as CompletedYaku[])

const teshiOrKuttsuki = computed(() =>
  completed.value.find((yaku) => yaku.name === 'teshi' || yaku.name === 'kuttsuki'),
)

const recordedWinner = computed(() => lastRoundResult.value?.winner)
</script>
