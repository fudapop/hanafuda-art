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
    computed(() => {
      if (!selectedCard.value) return [];
      return matchByMonth(
        // Exclude cards already staged for collection
        [...field.value].filter((card) => !staged.value.has(card)),
        selectedCard.value
      );
    });

  const matchExists = (card?: CardName) => {
    if (!card) return !!matchingCards.value?.length;
    return matchByMonth(
      [...field.value].filter((card) => !staged.value.has(card)),
      card
    );
  };

  const selectedCard = useSelectedCard();
  const matchingCards = useMatchedCards();

  const handleCardSelect = (card: CardName) => {
    if (selectedCard.value === card) {
      resetSelection();
      return;
    }

    if (selectedCard.value && matchExists()) {
      // Check if matches selectedCard
      matchSelection(card, selectedCard.value);
    } else {
      // Only select card from hand
      if (cs.field.has(card)) return;
      selectedCard.value = card;
      console.debug(
        gs.activePlayer.id.toUpperCase(),
        ">>> Selected",
        card.toUpperCase()
      );
      console.debug(
        "\tMatching:",
        matchExists() ? matchingCards.value?.join(", ").toUpperCase() : "NONE"
      );
    }
  };

  const matchSelection = (card: CardName, selected: CardName) => {
    if (matchingCards.value?.includes(card)) {
      matchingCards.value.length === 3
        ? // Collect the entire suit
          handleMatched([...matchingCards.value, selected])
        : // Player selects one match
          handleMatched([card, selected]);
    }
  };
  
  const handleMatched = (matches: CardName[]) => {
    cs.stageForCollection(matches);
    if (gs.checkCurrentPhase("draw")) cs.collectCards(gs.activePlayer.id);
    resetSelection();
    gs.nextPhase();
  };

  const resetSelection = () => {
    selectedCard.value = null;
    console.debug("\tSelection was reset");
  };

  return readonly({
    useSelectedCard,
    useMatchedCards,
    handleCardSelect,
    matchExists,
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

  it("returns an empty array if no card is selected", () => {
    useSelectedCard().value = null;
    expect(matches.value).toHaveLength(0);
  });
}
