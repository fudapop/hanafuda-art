import { beforeEach, it, describe, expect } from "vitest";
import { useCardStore } from "stores/cardStore";

const store = useCardStore();

beforeEach(() => {
  store.$reset();
});

it("initializes deck of 48 cards", () => {
  expect(store.deck).toHaveProperty("size", 48);
});

describe("accurately tracks deck size", () => {
  it("using cardsInPlay/cardsCollected", () => {
    store.dealCards();
    expect(new Set(store.cardsInPlay.concat(store.cardsCollected)).size).toBe(
      48
    );
  });
  it("using integrityCheck", () => {
    store.deck.clear();
    expect(store.integrityCheck).toBe(false);
  });
});

describe("maintains deck integrity", () => {
  it("after initial deal", () => {
    store.dealCards();
    expect(store.deck).toHaveProperty("size", 24);
    expect(store.integrityCheck).toBe(true);
  });
  it("after drawing from the deck", () => {
    const card = store.revealCard();
    store.discard(card, 'p1');
    expect(store.deck).toHaveProperty("size", 47);
    expect(store.field).toHaveProperty("size", 1);
    expect(store.integrityCheck).toBe(true);
  });
  it("after discarding a card", () => {
    store.dealCards();
    const card = [...store.hand.p1][0];
    expect(card).toBeTypeOf("string");
    store.discard(card, 'p1');
    expect(store.hand.p1).toHaveProperty("size", 7);
    expect(store.field).toHaveProperty("size", 9);
    expect(store.integrityCheck).toBe(true);
  });
  it("after collecting cards", () => {
    store.dealCards();
    const cards = [[...store.hand.p1][0], [...store.field][0]];
    store.stageForCollection(cards);
    expect(store.staged).toHaveProperty("size", 2)
    store.collectCards("p1");
    expect(store.staged.size).toBe(0);
    expect(store.field).toHaveProperty("size", 7);
    expect(store.collection.p1).toHaveProperty("size", 2);
    expect(store.integrityCheck).toBe(true);
  });
});
