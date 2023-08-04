import { storeToRefs } from "pinia";
import { CardName, matchByMonth, shuffle } from "~/utils/cards";
import { useCardStore } from "~/stores/cardStore";
import { useGameDataStore } from "~/stores/gameDataStore";

export const useCardHandler = () => {
	const cs = useCardStore();
	const ds = useGameDataStore();
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
		if (!card) return !!matchedCards.value?.length;
		return matchByMonth(
			[...field.value].filter((card) => !staged.value.has(card)),
			card
		);
	};

	const selectedCard = useSelectedCard();
	const matchedCards = useMatchedCards();

	const handleCardSelect = (card: CardName) => {
		// Player selecting a card from hand
		if (!selectedCard.value) {
			selectCardFromHand(card);
			return;
		}
		// Player is selecting a match from the field
		if (matchedCards.value.includes(card)) {
			// Player selected a valid match
			matchSelection(card, selectedCard.value);
		} else {
			// Player is changing original selection
			selectCardFromHand(card);
		}
	};

	const selectCardFromHand = (card: CardName) => {
		if (!cs.hand.p1.has(card)) return;
		selectedCard.value = card;
		console.debug(
			ds.getCurrent.player.toUpperCase(),
			">>> Selected",
			card.toUpperCase()
		);
	};

	const matchSelection = (card: CardName, selected: CardName) => {
		if (!matchedCards.value.includes(card)) {
			// This should not be possible
			const errMsg =
				"An unexpected error occurred during match selection.";
			console.error(errMsg, {
				selected: selectedCard.value,
				matched: matchedCards.value,
			});
			throw Error(errMsg);
		}
		// Player selected a valid match
		console.debug(
			"\tMatching:",
			matchedCards.value.join(", ").toUpperCase()
		);
		if (matchedCards.value.length === 3) {
			// Collect the entire suit
			handleMatched([...matchedCards.value, selected]);
		} else {
			// Player selects one match
			handleMatched([card, selected]);
		}
	};

	const handleMatched = (matches: CardName[]) => {
		cs.stageForCollection(matches);
    // Collect all matched card at the end of the turn;
		if (ds.checkCurrentPhase("draw")) {
      cs.collectCards(ds.getCurrent.player)
    };
		resetSelection();
		ds.nextPhase();
	};

	const resetSelection = () => {
		selectedCard.value = null;
		console.debug("\tSelection was reset");
	};

	const useActions = () => ({
		select() {
			console.assert(
				ds.checkCurrentPhase("select"),
				"Phase check failed. Check autoplay script or datastore."
			);
			const cardsInHand = shuffle([...cs.hand[ds.getCurrent.player]]);
			for (const card of cardsInHand) {
				if (matchExists(card)) {
					selectedCard.value = card;
					break;
				}
			}
		},

		matchOrDiscard() {
			const [selected, matches] = [
				selectedCard.value,
				matchedCards.value,
			];
			if (!selected) return;

			switch (matches.length) {
				case 0:
					cs.discard(selected, ds.getCurrent.player);
					break;
				case 3:
					cs.stageForCollection([...matches, selected]);
					break;
				default:
					cs.stageForCollection([getRandom(matches), selected]);
			}
			selectedCard.value = null;
			ds.nextPhase();
		},

		draw() {
			console.assert(
				ds.checkCurrentPhase("draw"),
				"Phase check failed. Check autoplay script or datastore."
			);
			selectedCard.value = cs.revealCard();
		},

		collect() {
			console.assert(
				ds.checkCurrentPhase("collect"),
				"Phase check failed. Check autoplay script or datastore."
			);
			if (cs.staged.size) cs.collectCards(ds.getCurrent.player);
			ds.nextPhase();
		},
	});

	return readonly({
		useSelectedCard,
		useMatchedCards,
		handleCardSelect,
		matchExists,
		useActions,
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
