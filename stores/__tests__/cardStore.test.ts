import { beforeEach, it, describe, expect } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCardStore } from "../cardStore";

describe("CardStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes deck of 48 cards", () => {
    const store = useCardStore();
    expect(store.deck).toHaveProperty("size", 48);
  });

  describe("accurately tracks deck size", () => {
    it("using cardsInPlay/cardsCollected", () => {
      const store = useCardStore();
      store.dealCards();
      expect(new Set(store.cardsInPlay.concat(store.cardsCollected)).size).toBe(48);
    });
    it("using integrityCheck", () => {
      const store = useCardStore();
      store.deck.clear();
      expect(store.integrityCheck).toBe(false);
    });
  });

  describe("maintains deck integrity", () => {
    it("after initial deal", () => {
      const store = useCardStore();
      store.dealCards();
      expect(store.deck).toHaveProperty("size", 24);
      expect(store.integrityCheck).toBe(true);
    });
    it("after drawing from the deck", () => {
      const store = useCardStore();
      const card = store.revealCard();
      store.discard(card, "p1");
      expect(store.deck).toHaveProperty("size", 47);
      expect(store.field).toHaveProperty("size", 1);
      expect(store.integrityCheck).toBe(true);
    });
    it("after discarding a card", () => {
      const store = useCardStore();
      store.dealCards();
      const card = [...store.hand.p1][0];
      expect(card).toBeTypeOf("string");
      store.discard(card, "p1");
      expect(store.hand.p1).toHaveProperty("size", 7);
      expect(store.field).toHaveProperty("size", 9);
      expect(store.integrityCheck).toBe(true);
    });
    it("after collecting cards", () => {
      const store = useCardStore();
      store.dealCards();
      const cards = [[...store.hand.p1][0], [...store.field][0]];
      store.stageForCollection(cards);
      expect(store.staged).toHaveProperty("size", 2);
      store.collectCards("p1");
      expect(store.staged.size).toBe(0);
      expect(store.field).toHaveProperty("size", 7);
      expect(store.collection.p1).toHaveProperty("size", 2);
      expect(store.integrityCheck).toBe(true);
    });
  });
});
