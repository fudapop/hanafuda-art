import { test, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useAutoplay } from "~/composables/useAutoplay";
import { useCardStore } from "~/stores/cardStore";
import { useGlobalStore } from "~/stores/globalStore";
import playVue from "pages/play.vue";

const testingPinia = createTestingPinia({
  stubActions: false,
});

const wrapper = mount(playVue, {
  global: {
    plugins: [testingPinia],
  },
});

const { autoPlay, TURN } = useAutoplay();
const cs = useCardStore();
const gs = useGlobalStore();

test(
  "Autoplay runs successfully", async () => {
      const deal = vi.spyOn(cs, "dealCards");
      const reveal = vi.spyOn(cs, "revealCard");
      const select = vi.spyOn(TURN, "select");
      const firstMatch = vi.spyOn(TURN, "firstMatch");
      const draw = vi.spyOn(TURN, "draw");
      const secondMatch = vi.spyOn(TURN, "secondMatch");
      const togglePlayer = vi.spyOn(gs, "toggleActivePlayer");
      await autoPlay({
        turns: 2,
      });
      expect(select).toHaveBeenCalledTimes(4);
      expect(firstMatch).toHaveBeenCalledTimes(4);
      expect(draw).toHaveBeenCalledTimes(4);
      expect(secondMatch).toHaveBeenCalledTimes(4);
      expect(deal).toHaveBeenCalledOnce();
      expect(reveal).toHaveBeenCalledTimes(4);
      expect(togglePlayer).toHaveBeenCalledTimes(4);
    },
  {
    timeout: 60000,
  }
);
