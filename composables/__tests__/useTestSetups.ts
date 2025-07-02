import type { CardStoreState } from "~/stores/cardStore";

export const useTestSetups = () => {
  /**
   * Tests the following conditions:
   *
   * - Awaiting player **selectMatchFromField**
   *
   * - Detecting **Kuttsuki** (4 pairs)
   *
   */
  const useMatchingTwoOnDraw = () => {
    const testState = (): CardStoreState => ({
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
      deck: new Set([
        "sakura-ni-maku",
        "sakura-no-tan",
        "ayame-ni-yatsuhashi",
        "ayame-no-tan",
        "ume-no-kasu-1",
        "ume-no-kasu-2",
        "fuji-ni-kakku",
        "fuji-no-tan",

        "hagi-ni-inoshishi",
        "hagi-no-tan",
        "hagi-no-kasu-1",
        "hagi-no-kasu-2",
        "botan-ni-chou",
        "botan-no-tan",
        "botan-no-kasu-1",
        "botan-no-kasu-2",

        "matsu-ni-tsuru",
        "matsu-no-tan",
        "sakura-no-kasu-1",
        "sakura-no-kasu-2",
        "ume-ni-uguisu",
        "ume-no-tan",
        "ayame-no-kasu-1",
        "ayame-no-kasu-2",

        "matsu-no-kasu-1",
        "matsu-no-kasu-2",
        "fuji-no-kasu-1",
        "fuji-no-kasu-2",
        "susuki-ni-tsuki",
        "susuki-ni-kari",
        "susuki-no-kasu-1",
        "susuki-no-kasu-2",
        "kiku-ni-sakazuki",
        "kiku-no-tan",
        "kiku-no-kasu-1",
        "kiku-no-kasu-2",
        "momiji-ni-shika",
        "momiji-no-tan",
        "momiji-no-kasu-1",
        "momiji-no-kasu-2",
        "yanagi-ni-ono-no-toufuu",
        "yanagi-ni-tsubame",
        "yanagi-no-tan",
        "yanagi-no-kasu",
        "kiri-ni-ho-oh",
        "kiri-no-kasu-1",
        "kiri-no-kasu-2",
        "kiri-no-kasu-3",
      ]),
    });

    return testState;
  };

  return {
    useMatchingTwoOnDraw,
  };
};
