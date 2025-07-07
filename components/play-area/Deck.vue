<template>
  <div class="relative">
    <div class="absolute inset-0 my-auto overflow-visible">
      <Transition
        appear
        enter-active-class="duration-300 ease-in origin-center"
        enter-from-class="scale-[3] translate-x-[50vw]"
        enter-to-class="scale-100 translate-x-0"
      >
        <div
          v-if="ps.bonusMultiplier > 1"
          class="w-full text-white bg-black/50 rounded-md tracking-wide absolute top-3/4 after:content-['KOI-KOI'] after:text-[0.6rem] after:font-semibold after:w-full after:block after:text-center"
        >
          <TransitionGroup
            appear
            name="stamp"
          >
            <div
              :title="`Winning score x${n}!`"
              v-for="n in ps.bonusMultiplier - 1"
              :key="n"
              class="absolute w-6 h-6 mt-4 -z-10"
              :style="{ marginLeft: `${(n - 1) * 15}px` }"
            >
              <img
                src="~/assets/images/coin.webp"
                alt="koi-koi bonus"
                class="object-cover object-center drop-shadow-sm"
              />
            </div>
          </TransitionGroup>
          <span class="absolute w-full mt-4 text-center drop-shadow-lg text-text"
            >x{{ ps.bonusMultiplier }}</span
          >
        </div>
      </Transition>

      <!-- DECK PILE -->
      <div
        class="absolute inset-y-0 my-auto overflow-hidden -translate-x-1/2 shadow-md left-1/2 card down"
      ></div>

      <!-- Show revealed card when drawing from deck         -->
      <HeadlessTransitionRoot
        appear
        :show="!!revealedCard"
        as="template"
      >
        <HeadlessTransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0 motion-safe:-scale-x-50"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0 motion-safe:translate-x-1"
        >
          <div
            v-if="revealedCard"
            class="relative z-30 overflow-hidden transition-transform card"
          >
            <template v-if="useConfigStore().cardLabels">
              <LazyCardLabel :card="revealedCard" />
            </template>
            <CardImage
              v-if="revealedCardImg"
              :key="revealedCard"
              :card="revealedCard"
              :src="revealedCardImg"
              class="object-cover mx-auto drop-shadow-lg"
            />
          </div>
        </HeadlessTransitionChild>
      </HeadlessTransitionRoot>

      <!-- Show 'Draw Card' button after the first match/discard -->
      <!-- <button v-else v-show="!selectedCard && ds.checkCurrentPhase('draw')" type="button"
        class="translate-x-[8px] translate-y-[52%] absolute inset-0 my-auto text-sm font-semibold text-white bg-indigo-600 shadow-sm card hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="handleDraw">
        Draw Card
      </button> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardDesign } from '~/composables/useCardDesign'
import { useCardHandler } from '~/composables/useCardHandler'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore } from '~/stores/playerStore'

const ps = usePlayerStore()
const ds = useGameDataStore()

const { getCardUrl } = useCardDesign()

const { useSelectedCard, useMatchedCards, useActions } = useCardHandler()
const { decisionIsPending } = useDecisionHandler()
const { draw, matchOrDiscard, collect } = useActions()

const { errorOnTimeout } = useTimeout()

const selectedCard = useSelectedCard()
const matchedCards = useMatchedCards()
const revealedCard = computed(() => ds.checkCurrentPhase('draw') && selectedCard.value)
const revealedCardImg = computed(() => (revealedCard.value ? getCardUrl(revealedCard.value) : null))

const isDrawPhase = computed(() => ds.checkCurrentPhase('draw') && ps.players.p1.isActive)
const autoOpponent = useState('opponent')

const playDrawPhase = async () => {
  draw()
  await sleep()
  // Allow player to select match
  if (matchedCards.value.length === 2) {
    await errorOnTimeout(selectMatchFromField, 30000, 'match-on-draw', {
      startMsg: 'Awaiting match selection...',
      callback: ds.endRound,
      endMsg: 'Resetting...',
    })()
  } else {
    matchOrDiscard()
  }
  await sleep()
  collect()
  await sleep()
  while (decisionIsPending.value) {
    await sleep()
  }
  ds.nextPhase()
}

const selectMatchFromField = async () => {
  while (selectedCard.value) {
    if (ds.roundOver || ds.gameOver) break
    console.info('Awaiting match selection...')
    await sleep()
  }
}

watch(isDrawPhase, () => {
  if (isDrawPhase.value) {
    // If P2 is active, the turn is controlled by useAutoplay
    if (autoOpponent.value && ps.players.p1.isActive) {
      // Autoplay the draw phase for P1
      playDrawPhase()
    }
  }
})
</script>
