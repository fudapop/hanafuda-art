import { beforeEach, it, describe, expect } from "vitest";
import { useGlobalStore } from "~/stores/globalStore";
import { CompletionEvent } from "~/components/CollectionArea.vue";

const store = useGlobalStore();

beforeEach(() => {
  store.$reset();
});

it("toggles which player is active", () => {
  store.toggleActivePlayer();
  expect(store.activePlayer).toBe(store.players.p2);
  store.toggleActivePlayer();
  expect(store.dealer).toBe(store.players.p1);
  store.players.p1.isActive = false;
  expect(() => store.activePlayer).toThrowError(Error);
});

it("toggles which player is the dealer", () => {
  store.toggleDealer();
  expect(store.dealer).toBe(store.players.p2);
  store.players.p2.isDealer = false;
  expect(() => store.dealer).toThrowError(Error);
});

it("properly initializes counters", () => {
  expect(store).toHaveProperty("bonusMultiplier", 1);
  expect(store).toHaveProperty("round", 1);
  expect(store).toHaveProperty("players.p1.score", 0);
  expect(store).toHaveProperty("players.p2.score", 0);
});

it("accurately increments counters", () => {
  store.updateScore("p2", 5);
  expect(store.players.p2.score).toBe(5);
  store.incrementBonus();
  expect(store.bonusMultiplier).toBe(2);
  store.incrementRound();
  expect(store.round).toBe(2);
});

it("tracks player scores and bonuses", () => {
  store.incrementBonus();
  store.updateScore("p1", 2);
  expect(store.players.p1.score).toBe(2);
});

describe("When ending a round:", () => {
  const testData: CompletionEvent = { player: 'p1', score: 3, completed: ['hanami-zake']}
  it("returns results of each round", () => {
    const result = store.recordRound(testData);
    expect(result).toBeTruthy();
    expect(result).toHaveProperty("round", 1)
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("score");
  })
  it("tracks round history", () => {
    store.recordRound(testData);
    store.nextRound();
    const result = store.recordRound(testData);
    expect(store.record).toHaveLength(2)
    expect(store.record[1]).toStrictEqual(result);
    expect(result).toHaveProperty("round", 2)
  })
})