<template>
  <ul class="relative h-full w-max mx-auto isolate pr-[60px]">
    <li v-for="(card, index) in displayedCards.filter((card) => card)" :key="index"
      class="absolute transition-all duration-100 origin-center" :style="styleArr[index]">
      <Transition appear mode="out-in" enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0 motion-safe:-translate-x-1" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100"
        leave-to-class="opacity-0 motion-safe:translate-x-1">
        <div v-if="card" :class="{
          'card drop-shadow-md overflow-hidden cursor-pointer transition-transform relative': true,
          'scale-105 drop-shadow-xl -translate-y-2 z-20': matchedCards?.includes(card),
          '-translate-y-4 drop-shadow-xl': selectedCard === card,
          'pointer-events-none staged': cs.staged.has(card),
          '-translate-y-2 after:absolute after:inset-0 after:w-full after:h-full after:border-4 after:border-indigo-500 after:dark:border-yellow-200 after:rounded-[inherit] after:animate-pulse': showMatchHint(card),
        }" @click="() => handleClick(card)">
          <template v-if="useConfigStore().cardLabels">
            <CardLabel :card="card" />
          </template>
          <CardImage :src="getCardUrl(card)!" :card="card" />
        </div>
      </Transition>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useCardDesign } from "~/composables/useCardDesign";
import { CardName } from "~/utils/cards";
import { useCardStore } from "~/stores/cardStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import { useConfigStore } from "~/stores/configStore";
import { PlayerKey, usePlayerStore } from "~/stores/playerStore";

const { id } = defineProps<{ id: PlayerKey }>();

const displayedCards: (CardName | undefined)[] = reactive(Array(8));

const styleArr: string[] = reactive([]);

const generateStyle = () => {
  styleArr.splice(0);
  styleArr.push(
    "z-index: 1; transform: rotate( -10deg ) translate( -150px , -10px );",
    "z-index: 2; transform: rotate( -8deg ) translate( -108px , -6px );",
    "z-index: 3; transform: rotate( -5deg ) translate( -64px , -2px );",
    "z-index: 4; transform: rotate( -2deg ) translate( -22px , 0px );",
    "z-index: 5; transform: rotate(  2deg ) translate( 22px , 0px );",
    "z-index: 6; transform: rotate( 5deg ) translate( 64px , -2px );",
    "z-index: 7; transform: rotate( 8deg ) translate( 108px , -6px );",
    "z-index: 8; transform: rotate( 10deg ) translate( 150px , -10px );"
  );
};

const cs = useCardStore();
const hand = computed(() => cs.hand[id]);

const placeCard = (cardName: CardName) => {
  const emptySlot = displayedCards.findIndex((card) => !card);
  displayedCards[emptySlot] = cardName;
};

const removeCard = (cardName: CardName) => {
  delete displayedCards[displayedCards.indexOf(cardName)];
  updateStyle();
};

const updateStyle = () => {
  if (styleArr.length % 2) {
    styleArr.shift();
  } else {
    styleArr.pop();
  }
};

const updateDisplayedCards = () => {
  for (const card of displayedCards) {
    if (!card) continue;
    if (!hand.value.has(card)) {
      removeCard(card);
    }
  }
  for (const card of hand.value) {
    if (!displayedCards.includes(card)) {
      placeCard(card);
    }
  }
};

watch(
  hand,
  () => {
    if (hand.value.size === 8) generateStyle();
    updateDisplayedCards();
  },
  { deep: true }
);

const { getCardUrl } = useCardDesign();

const { useSelectedCard, useMatchedCards, matchExists, handleCardSelect } = useCardHandler();

const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();

const showMatchHint = computed(() => (card: CardName) => useGameDataStore().checkCurrentPhase("select") && usePlayerStore().players.p1.isActive && (matchExists(card) as CardName[]).length)

const handleClick = (card: CardName) => {
  handleCardSelect(card);
};

onMounted(() => {
  generateStyle();
  updateDisplayedCards();
});
</script>
