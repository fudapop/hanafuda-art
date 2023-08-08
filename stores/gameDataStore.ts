import { defineStore } from "pinia";
import { PlayerKey, usePlayerStore } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { useStorage } from "@vueuse/core";
import { getRandomString } from "~/utils/myUtils";

export type RoundResult = {
	[x: string]: unknown;
	round?: number;
	winner: PlayerKey | null;
	score: number;
};

const PHASES = ["select", "draw", "collect"] as const;

type TurnPhase = (typeof PHASES)[number];

/**
 * @todo Create a configStore for game settings
 */
export const useConfig = () =>
	reactive({
		maxRounds: 3,
		autoplay: false,
		autoOpponent: true,
	});

/**
 * Coordinates the appropriate store actions during each phase of the game
 */
export const useGameDataStore = defineStore("gameData", () => {
	// State
	const gameId = ref(getRandomString(28));
	const roundHistory = useStorage(
		"hanafuda-data",
		[] as RoundResult[],
		localStorage,
		{ mergeDefaults: true }
	);
	const roundCounter = ref(roundHistory.value.length + 1);
	const turnCounter = ref(1);
	const turnPhase = ref("select" as TurnPhase);
	const roundOver = ref(false);
	// TODO: Create shared gameOver observer plugin
	const gameOver = ref(false);

	// Getters
	const getCurrent = computed(() => ({
		round: roundCounter.value,
		turn: turnCounter.value,
		phase: turnPhase.value,
		player: usePlayerStore().activePlayer.id,
		result: roundHistory.value[roundCounter.value - 1],
	}));

	const getPreviousResult = computed(() => roundHistory.value.at(-1));

	const scoreboard = computed(() => {
		const calcScore = (player: PlayerKey) => {
			return roundHistory.value
				.filter((result) => result.winner === player)
				.reduce((total, result) => total + (result?.score ?? 0), 0);
		};

		let p1Score = 30 + calcScore("p1") - calcScore("p2");
		if (p1Score < 0) p1Score = 0;
		let p2Score = 30 + calcScore("p2") - calcScore("p1");
		if (p2Score < 0) p2Score = 0;
		return {
			p1: p1Score,
			p2: p2Score,
		};
	});

	const pointsExhausted = computed(() =>
		[...Object.values(scoreboard.value)].some((score) => score === 0)
	);

	// Actions
	function nextPhase() {
		// Loop through phases; select -> draw -> select -> etc...
		const i = (PHASES.indexOf(turnPhase.value) + 1) % PHASES.length;
		turnPhase.value = PHASES[i];
		// console.debug("SWITCHED PHASE >>>", getCurrent.value.phase);
		if (turnPhase.value === "select") {
			usePlayerStore().toggleActivePlayer();
			if (usePlayerStore().activePlayer.isDealer) _incrementTurn();
		}
		return PHASES[i];
	}

	function checkCurrentPhase(phase: TurnPhase) {
		return turnPhase.value === phase;
	}

	function startRound() {
		if (roundOver.value) {
			console.error(
				"Failed to start game. State variable ('roundOver') not reset."
			);
			return;
		}
		turnPhase.value = PHASES[0];
		turnCounter.value = 1;
		roundCounter.value = roundHistory.value.length + 1;
		consoleLogColor(`ROUND ${roundCounter.value}`, "gray");
		console.debug("\tRecord", roundHistory.value);
		useCardStore().dealCards();
	}

	function saveResult(result: RoundResult) {
		const round = roundCounter.value;
		const index = round - 1;
		roundHistory.value[index] = { round, ...result };
		return getResult(round);
	}

	async function endRound() {
		if (!getCurrent.value.result)
			saveResult({
				round: roundCounter.value,
				winner: null,
				score: 0,
			});
		const { winner, score } = getCurrent.value.result;
		if (winner) usePlayerStore().updateScore(winner, score);
		roundOver.value = true;
		if (
			roundCounter.value >= useConfig().maxRounds ||
			pointsExhausted.value
		) {
			gameOver.value = true;
		}
	}

	function nextRound() {
		const { winner } = getCurrent.value.result;
		usePlayerStore().reset(winner);
		useCardStore().reset();
		roundOver.value = false;
	}

	function getResult(roundNum: number) {
		const index = roundNum - 1;
		const result = roundHistory.value[index];
		if (!result) {
			console.warn(`No results found for Round ${roundNum}.`);
		}
		return result;
	}

	function generateGameId() {
		gameId.value = getRandomString(28);
		return gameId.value;
	}

	function reset() {
		roundCounter.value = 1;
		roundOver.value = false;
		gameOver.value = false;
		const record = JSON.stringify(roundHistory.value.splice(0));
		return record;
		// TODO: Submit roundHistory to database;
	}

	function _incrementTurn() {
		turnCounter.value++;
		consoleLogColor(`TURN ${turnCounter.value}`, "gray");
	}

	return {
		// State
		gameId,
		roundCounter,
		turnCounter,
		turnPhase,
		roundHistory,
		roundOver,
		gameOver,
		// Getters
		getCurrent,
		getPreviousResult,
		scoreboard,
		pointsExhausted,
		// Actions
		nextPhase,
		checkCurrentPhase,
		startRound,
		saveResult,
		endRound,
		nextRound,
		generateGameId,
		reset,
	};
});
