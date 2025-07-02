import { beforeEach, it, describe, expect } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useGameDataStore } from "../gameDataStore";
import type { PlayerKey } from "../playerStore";

describe("GameDataStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("properly initializes counters", () => {
    const store = useGameDataStore();
    expect(store).toHaveProperty("roundCounter", 1);
    expect(store).toHaveProperty("turnCounter", 1);
  });

  it("progresses the turn phases in sequence", () => {
    const store = useGameDataStore();
    expect(store.nextPhase()).toBe("draw");
    expect(store.nextPhase()).toBe("collect");
    expect(store.nextPhase()).toBe("select");
    expect(store.nextPhase()).toBe("draw");
  });

  describe("When ending a round:", () => {
    const testData = { winner: "p1" as PlayerKey, score: 3, data: { completedYaku: ["hanami-zake"] } };
    it("returns results of each round", () => {
      const store = useGameDataStore();
      const result = store.saveResult(testData);
      expect(result).toBeTruthy();
      expect(result).toHaveProperty("round", 1);
      expect(result).toHaveProperty("winner");
      expect(result).toHaveProperty("score");
    });
    it("tracks round history", () => {
      const store = useGameDataStore();
      store.saveResult(testData);
      const result = store.saveResult(testData);
      expect(store.roundHistory).toHaveLength(1);
      expect(store.roundHistory[0]).toStrictEqual(result);
      expect(result).toHaveProperty("round", 1);
    });
  });

  it("returns complete history upon reset", () => {
    const store = useGameDataStore();
    const history = [
      { round: 1, winner: "p1" as PlayerKey, score: 3, data: { completedYaku: ["hanami-zake"] } },
      { round: 2, winner: "p1" as PlayerKey, score: 3, data: { completedYaku: ["hanami-zake"] } },
    ];
    store.$patch({ roundHistory: history });
    expect(store.roundHistory.length).toBe(2);
    const record = store.reset();
    expect(store.roundHistory.length).toBe(0);
    expect(JSON.parse(record)).toHaveLength(2);
  });
});
