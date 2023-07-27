/**
 * Tracks cards during game.
 * Provides methods to move cards around the table.
 * Ensures number of cards in game remains consistent.
 */

import { defineStore } from "pinia";
import { CardName, DECK, shuffle, sortByType } from "~/scripts/cards";
import { PlayerKey } from "./globalStore";
import { consoleLogColor } from "~/utils/logging";

type PlayerCardSet = Record<PlayerKey, Set<CardName>>;

interface cardStoreState {
  hand: PlayerCardSet;
  collection: PlayerCardSet;
  field: Set<CardName>;
  deck: Set<CardName>;
  staged: Set<CardName>;
}

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
    // Cards staged for collection
    staged: new Set([]),
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
    },
    // Show top card from the deck
    revealCard() {
      const cards = [...this.deck].slice(0, 1);
      return cards[0];
    },
    // Move card from hand/deck to the field
    discard(card: CardName, player: PlayerKey) {
      this.hand[player].delete(card);
      this.deck.delete(card);
      this.field.add(card);
      consoleLogColor(`${ player?.toUpperCase() ?? "  " } --- Discarded ${card.toUpperCase()}`, "palegoldenrod");
      if (this.staged.size) this.collectCards(player);
    },
    stageForCollection(cards: CardName[]) {
      // Not included in the Integrity Check
      this.addCards(cards, this.staged);
    },
    // Move cards from hand and field to a player's collection
    collectCards(player: PlayerKey) {
      const arr = [...this.staged];
      this.addCards(arr, this.collection[player]);
      this.removeCards(arr, this.hand[player]);
      this.removeCards(arr, this.field);
      this.removeCards(arr, this.deck);
      this.staged.clear();
      
      consoleLogColor(`${ player.toUpperCase() } +++ Collected ${arr.map(s => s.toUpperCase()).join(" + ")}`, "palegreen");
      console.debug("\t*Integrity Check.*", this.deck.size, "cards remaining.");
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
      for (const p in this.collection) this.collection[p as PlayerKey].clear();
      for (const p in this.hand) this.hand[p as PlayerKey].clear();
      this.staged.clear();
      this.field.clear();
      this.deck = new Set(shuffle([...DECK]));
    }
  },
});
