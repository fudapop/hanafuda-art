/**
 * Tracks cards during game.
 * Provides methods to move cards around the table.
 * Ensures number of cards in game remains consistent.
 */

import { defineStore } from "pinia";
import { PlayerKey } from "~/stores/playerStore";
import { CardName, matchByMonth, shuffle } from "~/utils/cards";

type PlayerCardSet = Record<PlayerKey, Set<CardName>>;

export interface CardStoreState {
	hand: PlayerCardSet;
	collection: PlayerCardSet;
	field: Set<CardName>;
	deck: Set<CardName>;
	staged: Set<CardName>;
}

export const useCardStore = defineStore("cards", {
	state: (): CardStoreState => ({
		// Cards in players' hands
		hand: {
			p1: new Set([]),
			p2: new Set([]),
		},
		// Cards collected by each player
		collection: {
			p1: new Set([]),
			p2: new Set([]),
		},
		// Cards staged for collection
		staged: new Set([]),
		// Cards not held by a player
		field: new Set([]),
		// deck: new Set(shuffle([...DECK])),
		deck: new Set([
			"sakura-ni-maku",
			"sakura-no-tan",
			"ayame-ni-yatsuhashi",
			"ayame-no-tan",
			"ume-no-kasu-1",
			"ume-no-kasu-2",
			"fuji-ni-kakku",
			"fuji-no-tan",

			"hagi-ni-inoshishi",
			"hagi-no-tan",
			"hagi-no-kasu-1",
			"hagi-no-kasu-2",
			"botan-ni-chou",
			"botan-no-tan",
			"botan-no-kasu-1",
			"botan-no-kasu-2",

			"matsu-ni-tsuru",
			"matsu-no-tan",
			"sakura-no-kasu-1",
			"sakura-no-kasu-2",
			"ume-ni-uguisu",
			"ume-no-tan",
			"ayame-no-kasu-1",
			"ayame-no-kasu-2",

			"matsu-no-kasu-1",
			"matsu-no-kasu-2",
			"fuji-no-kasu-1",
			"fuji-no-kasu-2",
			"susuki-ni-tsuki",
			"susuki-ni-kari",
			"susuki-no-kasu-1",
			"susuki-no-kasu-2",
			"kiku-ni-sakazuki",
			"kiku-no-tan",
			"kiku-no-kasu-1",
			"kiku-no-kasu-2",
			"momiji-ni-shika",
			"momiji-no-tan",
			"momiji-no-kasu-1",
			"momiji-no-kasu-2",
			"yanagi-ni-ono-no-toufuu",
			"yanagi-ni-tsubame",
			"yanagi-no-tan",
			"yanagi-no-kasu",
			"kiri-ni-ho-oh",
			"kiri-no-kasu-1",
			"kiri-no-kasu-2",
			"kiri-no-kasu-3",
		]),
	}),
	getters: {
		cardsInPlay: (state) => [
			...state.hand.p1,
			...state.hand.p2,
			...state.field,
			...state.deck,
		],
		cardsCollected: (state) => [
			...state.collection.p1,
			...state.collection.p2,
		],
		handsEmpty: (state) =>
			[state.hand.p1, state.hand.p2].every((hand) => hand.size === 0),
		// Getter returns a function
		handNotEmpty: (state) => (player: PlayerKey) =>
			state.hand[player].size > 0,
		// Non-arrow function to allow use of 'this'
		integrityCheck(): boolean {
			const total = this.cardsInPlay.length + this.cardsCollected.length;
			const valid = total === DECK.length;
			if (!valid) {
				console.error("Deck size mismatch detected. Errors may occur.");
			}
			return valid;
		},
	},
	actions: {
		// Deal the initial hands and field
		dealCards() {
			this.$patch((state) => {
				const cards = [...state.deck].slice(0, 24);
				this.addCards(cards.slice(0, 8), state.hand.p1);
				this.addCards(cards.slice(8, 16), state.hand.p2);
				this.addCards(cards.slice(16), state.field);
				this.removeCards(cards, state.deck);
			});
		},
		// Show top card from the deck
		revealCard() {
			const cards = [...this.deck].slice(0, 1);
			return cards[0];
		},
		// Move card from hand/deck to the field
		discard(card: CardName, player: PlayerKey) {
			this.$patch((state) => {
				state.hand[player].delete(card);
				state.deck.delete(card);
				state.field.add(card);
			});
			consoleLogColor(
				`${
					player?.toUpperCase() ?? "  "
				} --- Discarded ${card.toUpperCase()}`,
				"palegoldenrod"
			);
			if (this.staged.size) this.collectCards(player);
		},
		stageForCollection(cards: CardName[]) {
			// Not included in the Integrity Check
			this.addCards(cards, this.staged);
		},
		// Move cards from hand and field to a player's collection
		collectCards(player: PlayerKey) {
			const arr = [...this.staged];
			this.$patch((state) => {
				this.addCards(arr, state.collection[player]);
				this.removeCards(arr, state.hand[player]);
				this.removeCards(arr, state.field);
				this.removeCards(arr, state.deck);
				state.staged.clear();
			});

			consoleLogColor(
				`${player.toUpperCase()} +++ Collected ${arr
					.map((s) => s.toUpperCase())
					.join(" + ")}`,
				"palegreen"
			);
		},
		// Utility methods
		addCards(arr: CardName[], toSet: Set<CardName>) {
			for (const card of arr) {
				toSet.add(card);
			}
		},
		removeCards(arr: CardName[], fromSet: Set<CardName>) {
			for (const card of arr) {
				fromSet.delete(card);
			}
		},
		reset() {
			this.$patch((state) => {
				for (const p in state.collection)
					state.collection[p as PlayerKey].clear();
				for (const p in state.hand) state.hand[p as PlayerKey].clear();
				state.staged.clear();
				state.field.clear();
				state.deck = new Set(shuffle([...DECK]));
			});
		},
	},
});
