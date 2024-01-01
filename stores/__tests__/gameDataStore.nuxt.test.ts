import { beforeEach, it, describe, expect } from "vitest";
import { useGameDataStore } from "~/stores/gameDataStore";
import { PlayerKey } from "stores/playerStore";

const store = useGameDataStore();

beforeEach(() => {
  store.reset();
});

it("properly initializes counters", () => {
  expect(store).toHaveProperty("roundCounter", 1);
  expect(store).toHaveProperty("turnCounter", 1);
});

it("progresses the turn phases in sequence", () => {
  expect(store.nextPhase()).toBe("draw");
  expect(store.nextPhase()).toBe("collect");
  expect(store.nextPhase()).toBe("select");
  expect(store.nextPhase()).toBe("draw");
});

describe("When ending a round:", () => {
  const testData = { winner: 'p1' as PlayerKey, score: 3, data: {completedYaku: ['hanami-zake']}}
  it("returns results of each round", () => {
    const result = store.saveResult(testData);
    expect(result).toBeTruthy();
    expect(result).toHaveProperty("round", 1)
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("score");
  })
  it("tracks round history", () => {
    store.saveResult(testData);
    const result = store.saveResult(testData);
    expect(store.roundHistory).toHaveLength(1)
    expect(store.roundHistory[0]).toStrictEqual(result);
    expect(result).toHaveProperty("round", 1)
  })
})

it("returns complete history upon reset", () => {
  const history = [
    { round: 1, winner: 'p1' as PlayerKey, score: 3, data: {completedYaku: ['hanami-zake']}},
    { round: 2, winner: 'p1' as PlayerKey, score: 3, data: {completedYaku: ['hanami-zake']}},
  ];
  store.$patch({ roundHistory: history });
  expect(store.roundHistory.length).toBe(2);
  const record = store.reset();
  expect(store.roundHistory.length).toBe(0);
  expect(JSON.parse(record)).toHaveLength(2);
})