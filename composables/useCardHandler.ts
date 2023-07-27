import { storeToRefs } from "pinia";
import { matchByMonth, CardName } from "~/scripts/cards";
import { useCardStore } from "~/stores/cardStore";
import { useGlobalStore } from "~/stores/globalStore";

export const useCardHandler = () => {
  const cs = useCardStore();
  const gs = useGlobalStore();
  const { field, staged } = storeToRefs(cs);

  const useSelectedCard = (): Ref<CardName | null> =>
    useState("selected", () => null);
  const useMatchedCards = () =>
    computed(() =>
      selectedCard.value
        ? matchByMonth(
            // Exclude cards already staged for collection
            [...field.value].filter((card) => !staged.value.has(card)),
            selectedCard.value
          )
        : null
    );

  const selectedCard = useSelectedCard();
  const matchingCards = useMatchedCards();

  const handleCardSelect = (card: CardName) => {
    if (selectedCard.value === card) {
      resetSelection();
      return;
    }
    if (selectedCard.value && matchingCards.value?.length) {
      // Check if matches selectedCard
      matchSelection(card, selectedCard.value);
    } else {
      // Only select card from hand
      if (cs.field.has(card)) return;
      selectedCard.value = card;
      console.log(card, "selected");
      console.log("matches", matchingCards.value);
    }
  };

  const matchSelection = (card: CardName, selected: CardName) => {
    if (matchingCards.value?.includes(card)) {
      console.log(card, "matched");
      matchingCards.value.length === 3
        ? // Collect the entire suit
          handleMatched([...matchingCards.value, selected])
        : // Player selects one match
          handleMatched([card, selected]);
    }
  };

  const handleMatched = (matches: CardName[]) => {
    cs.stageForCollection(matches);
    if (gs.phase === "draw") cs.collectCards(gs.activePlayer.id);
    resetSelection();
    gs.nextPhase();
  };

  const resetSelection = () => {
    selectedCard.value = null;
    console.log("Selection reset");
  };

  return readonly({
    useSelectedCard,
    useMatchedCards,
    handleCardSelect,
  });
};

// @vitest-environment nuxt
if (import.meta.vitest) {
  const testFieldCards: CardName[] = [
    "matsu-no-kasu-1",
    "matsu-no-tan",
    "sakura-ni-maku",
  ];

  useCardStore().addCards(testFieldCards, useCardStore().field);
  const { useMatchedCards, useSelectedCard } = useCardHandler();
  useSelectedCard().value = "matsu-ni-tsuru";
  const matches = useMatchedCards();

  it("returns an array with matching cards", () => {
    expect(matches.value).toEqual(["matsu-no-kasu-1", "matsu-no-tan"]);
  });

  it("returns null of no card is selected", () => {
    useSelectedCard().value = null;
    expect(matches.value).toBeNull();
  });
}
