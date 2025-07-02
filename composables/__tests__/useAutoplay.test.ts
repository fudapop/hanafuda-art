import { test, expect, vi, beforeEach } from "vitest";
import { useAutoplay } from "~/composables/useAutoplay";
import { useCardStore } from "~/stores/cardStore";
import { usePlayerStore } from "~/stores/playerStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import { createPinia, setActivePinia } from "pinia";

beforeEach(() => {
  setActivePinia(createPinia());
});

// TODO: Move this test to E2E tests. This test requires a a nuxt environment to run.
test.skip("Autoplay runs successfully", { timeout: 10000 }, async () => {
  const cs = useCardStore();
  const ds = useGameDataStore();
  const ps = usePlayerStore();
  const { autoPlay, TURN } = useAutoplay();

  const deal = vi.spyOn(cs, "dealCards");
  const reveal = vi.spyOn(cs, "revealCard");
  const select = vi.spyOn(TURN, "select");
  const firstMatch = vi.spyOn(TURN, "firstMatch");
  const draw = vi.spyOn(TURN, "draw");
  const secondMatch = vi.spyOn(TURN, "secondMatch");
  const togglePlayer = vi.spyOn(ps, "toggleActivePlayer");
  const nextPhase = vi.spyOn(ds, "nextPhase");
  const nextRound = vi.spyOn(ds, "nextRound");
  await autoPlay({
    turns: 1,
  });
  expect(select).toHaveBeenCalledTimes(2);
  expect(firstMatch).toHaveBeenCalledTimes(2);
  expect(draw).toHaveBeenCalledTimes(2);
  expect(secondMatch).toHaveBeenCalledTimes(2);
  expect(deal).toHaveBeenCalledOnce();
  expect(reveal).toHaveBeenCalledTimes(2);
  expect(togglePlayer).toHaveBeenCalledTimes(2);
  expect(nextPhase).toHaveBeenCalledTimes(6);
  expect(nextRound).toHaveBeenCalledOnce();
});
