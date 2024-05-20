import { defineStore } from "pinia";
import { type YakuName, viewingYaku } from "~/utils/yaku";

const OPTIONS = {
  GAME_LENGTH: [3, 6, 12] as const,

  VIEWINGS: ["allow", "limited", "none"] as const,
} as const;

type GameLengthOptions = (typeof OPTIONS.GAME_LENGTH)[number];
type ViewingsOptions = (typeof OPTIONS.VIEWINGS)[number];

export interface GameSettings {
  rounds: GameLengthOptions;
  viewings: ViewingsOptions;
  double: boolean;
  wild: boolean;
  labels: boolean;
  fullscreen: boolean;
}

const useConfigStore = defineStore("config", () => {
  const maxRounds = ref(3) as Ref<GameLengthOptions>;

  const allowViewingsYaku = ref("allow") as Ref<ViewingsOptions>;

  const doubleScoreOverSeven = ref(false);

  const sakeIsWildCard = ref(false);

  const cardLabels = ref(false);

  const allowFullscreen = ref(false);

  const getCurrentSettings = computed(
    (): GameSettings => ({
      rounds: maxRounds.value,
      viewings: allowViewingsYaku.value,
      double: doubleScoreOverSeven.value,
      wild: sakeIsWildCard.value,
      labels: cardLabels.value,
      fullscreen: allowFullscreen.value,
    }),
  );

  function loadUserSettings(userSettings: GameSettings) {
    maxRounds.value = userSettings.rounds;
    allowViewingsYaku.value = userSettings.viewings;
    doubleScoreOverSeven.value = userSettings.double;
    sakeIsWildCard.value = userSettings.wild;
    cardLabels.value = userSettings.labels;
    allowFullscreen.value = userSettings.fullscreen;
  }

  /**
   * Filter an array/set of yaku based on set rule
   */
  function applyViewingsOption(yakuList: YakuName[]) {
    const filteredList = yakuList.filter((yaku) => !viewingYaku.has(yaku));

    switch (allowViewingsYaku.value) {
      case "none":
        return filteredList;

      case "limited":
        if (filteredList.length) {
          return yakuList;
        } else {
          return filteredList;
        }

      case "allow":
      default:
        return yakuList;
    }
  }

  /**
   * Adds/removes the sake cup to the check for plains
   */
  function applyWildCardOption() {
    const plains = YAKU.kasu.cards;
    const isIncluded = plains.includes("kiku-ni-sakazuki");

    if (sakeIsWildCard.value) {
      if (!isIncluded) plains.push("kiku-ni-sakazuki");
    } else {
      if (isIncluded) {
        plains.splice(plains.indexOf("kiku-ni-sakazuki"), 1);
      }
    }
  }

  /**
   * Double score if base score (w/o bonus from koi-koi) is 7 or greater
   */
  function applyDoubleScoreOption(baseScore: number) {
    if (!doubleScoreOverSeven.value) return baseScore;
    if (baseScore < 7) return baseScore;
    return baseScore * 2;
  }

  return {
    doubleScoreOverSeven,
    allowViewingsYaku,
    maxRounds,
    sakeIsWildCard,
    cardLabels,
    allowFullscreen,
    getCurrentSettings,
    loadUserSettings,
    applyViewingsOption,
    applyWildCardOption,
    applyDoubleScoreOption,
    OPTIONS,
  };
});

export { useConfigStore, type GameLengthOptions, type ViewingsOptions };
