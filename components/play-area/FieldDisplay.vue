<template>
  <ul
    :class="{
      'transition-all duration-500 ease-out max-sm:flex max-sm:flex-wrap max-sm:w-[300px] sm:w-max sm:grid sm:grid-cols-7 gap-1': true,
      'sm:[&>:nth-child(n+8)]:-translate-y-8 sm:[&>:nth-child(n+8):nth-child(-n+14)]:translate-x-1/2': true,
      'max-sm:[&>:nth-child(n+6):nth-child(-n+10)]:-translate-y-4 max-sm:[&>:nth-child(n+10)]:-translate-y-8 max-sm:[&>:nth-child(n+6):nth-child(-n+10)]:translate-x-1/2': thirdRowIsOccupied,
      'origin-left max-xs:scale-90': thirdRowIsOccupied,
    }"
  >
    <li v-for="(card, index) in displayedCards" :key="index" class="origin-center">
      <Transition
        appear
        mode="out-in"
        enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0 motion-safe:-translate-x-1"
        enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 motion-safe:translate-x-1"
      >
        <div
          v-if="card"
          :key="`${index}-${card}`"
          :class="{
            'card drop-shadow-md overflow-hidden cursor-pointer transition-all relative': true,
            'drop-shadow-xl -translate-y-2 z-10 after:absolute after:inset-0 after:w-full after:h-full after:border-4 after:border-indigo-400 after:dark:border-yellow-200 after:rounded-[inherit] after:animate-pulse': matchedCards?.includes(
              card
            ),
            '-translate-y-2 drop-shadow-xl': selectedCard === card,
            'pointer-events-none staged': cs.staged.has(card),
          }"
          :title="card.replace(/-\d?/g, ' ')"
          @click="() => handleClick(card)"
        >
          <template v-if="useConfigStore().cardLabels">
            <LazyCardLabel :card="card" />
          </template>
          <CardImage :src="getCardUrl(card)!" :card="card" />
        </div>

        <!-- Display empty slots -->
        <template v-else>
          <div
            v-show="isThirdRow(index) ? thirdRowIsOccupied : true"
            class="h-[--card-height] aspect-[--card-aspect] rounded-[--card-radius] border-none relative after:opacity-10 after:absolute after:inset-0 after:m-auto after:h-[90%] after:w-[90%] after:border after:border-white after:rounded-[inherit]"
          >
            <span class="sr-only">empty field slot</span>

            <!-- Show slots as animated 'Discard' buttons if there are no matches on the field for the selected card -->
            <button
              v-show="discarding"
              type="button"
              class="absolute z-10 cursor-pointer inset-0 rounded-[inherit] w-[90%] h-[90%] m-auto bg-gray-500/10 ring-2 ring-inset ring-offset-1 ring-indigo-500 dark:ring-yellow-200 animate-pulse"
              @click="() => handleDiscard(index)"
            ></button>
          </div>
        </template>
      </Transition>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCardDesign } from "~/composables/useCardDesign";
import { type CardName } from "~/utils/cards";
import { useCardStore } from "~/stores/cardStore";
import { usePlayerStore } from "~/stores/playerStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import { useConfigStore } from "~/stores/configStore";

const displayedCards: (CardName | undefined)[] = reactive(Array(14));
const isThirdRow = (index: number) => index > 9;
const thirdRowIsOccupied = computed(
  () =>
    !!displayedCards.slice(10).filter((card) => !!card).length ||
    displayedCards.filter((card) => !!card).length > 9
);

const cs = useCardStore();
const { field } = storeToRefs(cs);

const placeCard = (cardName: CardName) => {
  const emptySlot = displayedCards.findIndex((card) => !card);
  displayedCards[emptySlot] = cardName;
};

const removeCard = (cardName: CardName) => {
  displayedCards[displayedCards.indexOf(cardName)] = undefined;
};

const updateDisplayedCards = () => {
  for (const card of displayedCards) {
    if (!card) continue;
    if (!cs.field.has(card)) {
      removeCard(card);
    }
  }
  for (const card of [...cs.field]) {
    if (!displayedCards.includes(card)) {
      placeCard(card);
    }
  }
};

watch(
  field,
  () => {
    updateDisplayedCards();
  },
  { deep: true }
);

const { getCardUrl } = useCardDesign();

const { useSelectedCard, useMatchedCards, handleCardSelect } = useCardHandler();

const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();

const discarding = computed(() =>
  [
    useGameDataStore().checkCurrentPhase("select"),
    !!selectedCard.value,
    !matchedCards.value.length,
    usePlayerStore().players.p1.isActive,
  ].every((cond) => cond === true)
);

const handleDiscard = async (index: number) => {
  if (!selectedCard.value) return;
  displayedCards[index] = selectedCard.value;
  cs.discard(selectedCard.value, "p1");
  selectedCard.value = null;
  await sleep();
  useGameDataStore().nextPhase();
};

const handleClick = (card: CardName) => {
  handleCardSelect(card);
};

onMounted(() => {
  updateDisplayedCards();
});
</script>
