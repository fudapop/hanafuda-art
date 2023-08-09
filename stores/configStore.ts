import { defineStore } from "pinia";
import { YakuName } from "~/utils/yaku";

const OPTIONS = {
	GAME_LENGTH: [3, 6, 12] as const,

	VIEWINGS: ["allow", "limited", "none"] as const,

	DIFFICULTY: ["easy", "normal", "hard"] as const,
} as const;

type GameOptions = keyof typeof OPTIONS;
type GameLengthOptions = (typeof OPTIONS.GAME_LENGTH)[number];
type ViewingsOptions = (typeof OPTIONS.VIEWINGS)[number];
type DifficultyOptions = (typeof OPTIONS.DIFFICULTY)[number];

const useConfigStore = defineStore("config", () => {
	const maxRounds = ref(3) as Ref<GameLengthOptions>;

	const difficulty = ref("normal") as Ref<DifficultyOptions>;

	const allowViewingsYaku = ref("allow") as Ref<ViewingsOptions>;

	const doubleScoreOverSeven = ref(false);

	const sakeIsWildCard = ref(false);

	const getCurrentSettings = computed(() => ({
		rounds: maxRounds.value,
		difficulty: difficulty.value,
		viewings: allowViewingsYaku.value,
		double: doubleScoreOverSeven.value,
		wild: sakeIsWildCard.value,
	}));

	/**
	 * Filter an array/set of yaku based on set rule
	 */
	function applyViewingsOption(yakuList: YakuName[]) {
		const limitedYaku = ["hanami-zake", "tsukimi-zake"];
		const filteredList = yakuList.filter((yaku) => !limitedYaku.includes(yaku));

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

	return {
		doubleScoreOverSeven,
		allowViewingsYaku,
		maxRounds,
		sakeIsWildCard,
		difficulty,
		getCurrentSettings,
		applyViewingsOption,
		OPTIONS,
	};
});

export {
	useConfigStore,
	GameLengthOptions,
	ViewingsOptions,
	DifficultyOptions,
};
