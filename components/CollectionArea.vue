<template>
  <div class="gap-1 collection-area">
    <!-- PLAYER 1 COLLECTION -->
    <ul class="flex h-full py-2">
      <CardList :cards="brights" :stack="true" />
    </ul>
    <ul class="flex h-full py-2">
      <CardList :cards="animals" :stack="true" />
    </ul>
    <ul class="flex h-full py-2">
      <CardList :cards="ribbons" :stack="true" />
    </ul>
    <ul class="flex h-full py-2">
      <CardList :cards="plains" :stack="true" />
    </ul>
  </div>
</template>

<script setup lang="ts">
import { PlayerKey } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { CardName, sortByType } from "~/utils/cards";
import { checkAll, YAKU, YakuName, CompletedYaku } from "~/utils/yaku";
import { useGameDataStore } from "~/stores/gameDataStore";
import { storeToRefs } from "pinia";

export type CompletionEvent = {
  player: PlayerKey;
  score: number;
  completedYaku: CompletedYaku[];
};

const { player } = defineProps<{ player: PlayerKey }>();
const emits = defineEmits<{
  (event: "completed", data: CompletionEvent): void;
}>();

const { roundOver } = storeToRefs(useGameDataStore());
const cs = useCardStore();

const brights: Ref<Set<CardName>> = ref(new Set([]));
const animals: Ref<Set<CardName>> = ref(new Set([]));
const ribbons: Ref<Set<CardName>> = ref(new Set([]));
const plains: Ref<Set<CardName>> = ref(new Set([]));

const collection = computed(() => sortByType([...cs.collection[player]]));
const cBrights = computed(() => collection.value.brights);
const cAnimals = computed(() => collection.value.animals);
const cRibbons = computed(() => collection.value.ribbons);
const cPlains = computed(() => collection.value.plains);

const updateCollection = () => {
  cBrights.value.forEach((card) => brights.value.add(card));
  cAnimals.value.forEach((card) => animals.value.add(card));
  cRibbons.value.forEach((card) => ribbons.value.add(card));
  cPlains.value.forEach((card) => plains.value.add(card));
  console.debug("\t", player.toUpperCase(), {
    Brights: cBrights.value.length,
    Animals: cAnimals.value.length,
    Ribbons: cRibbons.value.length,
    Plains: cPlains.value.length,
  });
};

const resetCollection = () => {
  brights.value.clear();
  animals.value.clear();
  ribbons.value.clear();
  plains.value.clear();
};

let lastCompleted: Set<YakuName> = new Set([]);

watch(roundOver, () => {
  if (roundOver.value) {
    lastCompleted.clear();
    resetCollection();
  }
});

watch(
  collection,
  () => {
    if (roundOver.value) return;
    updateCollection();

    const { score, completed: completedYaku } = checkAll(cs.collection[player]);

    const newCompleted = completedYaku.map((yaku) => {
      // Allow upgrading yaku to trigger emit.
      if (["kasu", "tan-zaku", "tane-zaku"].includes(yaku)) {
        const extra =
          YAKU[yaku].find(cs.collection[player]).length - YAKU[yaku].numRequired;
        return `${yaku}+${extra}`;
      } else {
        return yaku;
      }
    }) as YakuName[];

    if (newCompleted.every((yaku) => lastCompleted.has(yaku))) return;

    if (completedYaku.length) {
      // Emits only if new yaku completed.
      lastCompleted = new Set(newCompleted);
      emits("completed", {
        player,
        score,
        completedYaku: getCompleted(cs.collection[player], completedYaku),
      });
    }
  },
  { flush: "post" }
);
</script>
lib/cardslib/yaku
