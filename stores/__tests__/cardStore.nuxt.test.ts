import { useCardStore } from "stores/cardStore";

const store = useCardStore();

beforeEach(() => {
  store.$reset();
});

describe("state", () => {
  it("initializes deck of 48 cards", () => {
    expect(store.deck).toHaveProperty("size", 48);
  });
});

describe("getters accurately track deck size", () => {
  it("cardsInPlay/cardsCollected", () => {
    store.dealCards();
    expect(new Set(store.cardsInPlay.concat(store.cardsCollected)).size).toBe(
      48
    );
  });
  it("integrityCheck", () => {
    store.deck.clear();
    expect(store.integrityCheck).toBe(false);
  });
});

describe("actions maintain deck integrity", () => {
  it("after initial deal", () => {
    store.dealCards();
    expect(store.deck).toHaveProperty("size", 24);
    expect(store.integrityCheck).toBe(true);
  });
  it("after drawing from the deck", () => {
    store.drawCard();
    expect(store.deck).toHaveProperty("size", 47);
    expect(store.field).toHaveProperty("size", 1);
    expect(store.integrityCheck).toBe(true);
  });
  it("after collecting cards", () => {
    store.dealCards();
    const cards = [[...store.hand.p1][0], [...store.field][0]];
    store.collectCards(cards, "p1");
    expect(store.field).toHaveProperty("size", 7);
    expect(store.collection.p1).toHaveProperty("size", 2);
    expect(store.integrityCheck).toBe(true);
  });
});
