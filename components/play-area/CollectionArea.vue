<template>
  <div class="gap-1 opacity-75 collection-area">
    <!-- PLAYER 1 COLLECTION -->
    <ul v-for="type in cardTypes" :key="type" class="relative flex h-full py-2">
      <span
        v-show="coll[type].size > 0"
        class="uppercase absolute top-1 left-0 z-[1] whitespace-nowrap bg-gray-800 text-white text-[8px] tracking-wide p-[0.2em_1em] rounded-lg"
      >
        <span class="mr-1 text-xs align-middle">
          {{ coll[type].size }}
        </span>
        {{ type }}
      </span>
      <CardList :cards="coll[type]" :stack="true" />
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
import { useConfigStore } from "~/stores/configStore";

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
const config = useConfigStore();

const cardTypes = ["brights", "animals", "ribbons", "plains"] as const;
const coll: Record<string, Set<CardName>> = reactive({
  brights: new Set([]),
  animals: new Set([]),
  ribbons: new Set([]),
  plains: new Set([]),
});

const collection = computed(() => sortByType([...cs.collection[player]]));
const cBrights = computed(() => collection.value.brights);
const cAnimals = computed(() => collection.value.animals);
const cRibbons = computed(() => collection.value.ribbons);
const cPlains = computed(() => collection.value.plains);

const updateCollection = () => {
  cBrights.value.forEach((card) => coll.brights.add(card));
  cAnimals.value.forEach((card) => coll.animals.add(card));
  cRibbons.value.forEach((card) => coll.ribbons.add(card));
  cPlains.value.forEach((card) => coll.plains.add(card));
  console.debug("\t", player.toUpperCase(), {
    Brights: cBrights.value.length,
    Animals: cAnimals.value.length,
    Ribbons: cRibbons.value.length,
    Plains: cPlains.value.length,
  });
};

const resetCollection = () => {
  coll.brights.clear();
  coll.animals.clear();
  coll.ribbons.clear();
  coll.plains.clear();
};

/**
 * Appends '+{n}' to denote the number of extra cards
 * to track if the yaku is upgraded
 */
const applyExtraTags = (yakuList: YakuName[]) => {
  const taggedList = yakuList.map((yaku) => {
    // Allow upgrading yaku to trigger emit.
    if (["kasu", "tan-zaku", "tane-zaku"].includes(yaku)) {
      const extra =
        YAKU[yaku].find(cs.collection[player]).length - YAKU[yaku].numRequired;
      return `${yaku}+${extra}`;
    } else {
      return yaku;
    }
  }) as YakuName[];
  return taggedList;
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

    config.applyWildCardOption();
    const { score, completed: completedYaku } = checkAll(cs.collection[player]);

    // Filter list based on viewings allowance setting
    const newCompleted = config.applyViewingsOption(completedYaku);

    // Tag potentially upgraded yaku
    const taggedYaku = applyExtraTags(newCompleted);

    // No yaku completed or upgraded since the last update
    if (taggedYaku.every((yaku) => lastCompleted.has(yaku))) return;

    if (completedYaku.length) {
      // Emits only if new yaku completed.
      lastCompleted = new Set(taggedYaku);
      emits("completed", {
        player,
        score: config.applyDoubleScoreOption(score),
        completedYaku: getCompleted(cs.collection[player], completedYaku),
      });
    }
  },
  { flush: "post" }
);
</script>
lib/cardslib/yaku
