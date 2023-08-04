import { defineStore } from "pinia";
import { PlayerKey, usePlayerStore } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { useStorage } from "@vueuse/core";

type RoundResult = {
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
	const roundCounter = ref(1);
	const turnCounter = ref(1);
	const turnPhase = ref("select" as TurnPhase);
	const roundHistory = useStorage(
		"hanafuda-data",
		[] as RoundResult[],
		localStorage
	);
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

	// Actions
	function nextPhase() {
		// Loop through phases; select -> draw -> select -> etc...
		const i = (PHASES.indexOf(turnPhase.value) + 1) % PHASES.length;
		turnPhase.value = PHASES[i];
		// console.debug("SWITCHED PHASE >>>", getCurrent.value.phase);
		if (turnPhase.value === "select") {
			if (useCardStore().handsEmpty) {
				endRound();
			} else {
				usePlayerStore().toggleActivePlayer();
				if (usePlayerStore().activePlayer.isDealer) _incrementTurn();
			}
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
		useCardStore().dealCards();
	}

	function saveResult(result: RoundResult) {
		const round = roundCounter.value;
		const index = round - 1;
		roundHistory.value[index] = { round, ...result };
		return getResult(round);
	}

	function endRound() {
		if (!getCurrent.value.result)
			saveResult({
				round: roundCounter.value,
				winner: null,
				score: 0,
				error: "forfeit",
			});
		roundOver.value = true;
		console.debug("\tRecord", roundHistory.value);
		// if (roundCounter.value >= useConfig().maxRounds) gameOver.value = true;
	}

	function nextRound() {
		const winner = getCurrent.value.result?.winner || null;
		usePlayerStore().reset(winner);
		useCardStore().reset();
		_incrementRound();
		turnCounter.value = 1;
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

	function reset() {
		roundCounter.value = 1;
		roundOver.value = false;
		gameOver.value = false;
		const record = JSON.stringify(roundHistory.value.splice(0));
		return record;
		// TODO: Submit roundHistory to database;
	}

	function _incrementRound() {
		roundCounter.value++;
		consoleLogColor(`ROUND ${roundCounter.value}`, "gray");
	}

	function _incrementTurn() {
		turnCounter.value++;
		consoleLogColor(`TURN ${turnCounter.value}`, "gray");
	}

	return {
		// State
		roundCounter,
		turnCounter,
		turnPhase,
		roundHistory,
		roundOver,
		gameOver,
		// Getters
		getCurrent,
		getPreviousResult,
		// Actions
		nextPhase,
		checkCurrentPhase,
		startRound,
		saveResult,
		endRound,
		nextRound,
		reset,
	};
});
