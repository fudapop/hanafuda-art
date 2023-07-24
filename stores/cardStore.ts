/**
 * Tracks cards during game.
 * Provides methods to move cards around the table.
 * Ensures number of cards in game remains consistent.
 */

import { defineStore } from "pinia";
import { CardName, DECK, shuffle } from "../scripts/cards";

interface cardStoreState {
  hand: {
    p1: Set<CardName>;
    p2: Set<CardName>;
  };
  collection: {
    p1: Set<CardName>;
    p2: Set<CardName>;
  };
  field: Set<CardName>;
  deck: Set<CardName>;
}

type PlayerKey = "p1" | "p2";

export const useCardStore = defineStore("cards", {
  state: (): cardStoreState => ({
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
    // Cards not held by a player
    field: new Set([]),
    deck: new Set(shuffle([...DECK])),
  }),
  getters: {
    cardsInPlay: (state) => [
      ...state.hand.p1,
      ...state.hand.p2,
      ...state.field,
      ...state.deck,
    ],
    cardsCollected: (state) => [...state.collection.p1, ...state.collection.p2],
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
      const cards = [...this.deck].slice(0, 24);
      this.addCards(cards.slice(0, 8), this.hand.p1);
      this.addCards(cards.slice(8, 16), this.hand.p2);
      this.addCards(cards.slice(16), this.field);
      this.removeCards(cards, this.deck);
      console.info("Passed health check: ", this.integrityCheck);
    },
    // Move top card from the deck to the field
    drawCard() {
      const cards = [...this.deck].slice(0, 1);
      this.addCards(cards, this.field);
      this.removeCards(cards, this.deck);
    },
    // Move cards from hand and field to a player's collection
    collectCards(arr: CardName[], player: PlayerKey) {
      this.addCards(arr, this.collection[player]);
      this.removeCards(arr, this.hand[player]);
      this.removeCards(arr, this.field);
      console.info("Passed health check: ", this.integrityCheck);
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
  },
});
