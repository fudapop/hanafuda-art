import { test, expect, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useAutoplay } from "~/composables/useAutoplay";
import { useCardStore } from "~/stores/cardStore";
import { usePlayerStore } from "~/stores/playerStore";
import { useGameDataStore } from "~/stores/gameDataStore";
import playVue from "~/pages/play.vue";

const testingPinia = createTestingPinia({
  stubActions: false,
});

const wrapper = shallowMount(playVue, {
  global: {
    plugins: [testingPinia],
  },
});

const { autoPlay, TURN } = useAutoplay();
const cs = useCardStore(testingPinia);
const ds = useGameDataStore(testingPinia);
const ps = usePlayerStore(testingPinia);

test(
  "Autoplay runs successfully", async () => {
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
      expect(nextRound).not.toHaveBeenCalled();
    },
  {
    timeout: 60000,
  }
);
