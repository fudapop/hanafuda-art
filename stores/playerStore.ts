import { defineStore } from "pinia";

export type PlayerKey = "p1" | "p2";

export type Player = {
	readonly id: PlayerKey;
	isActive: boolean;
	isDealer: boolean;
	score: number;
};

export const usePlayerStore = defineStore("players", () => {
	// State
	const players: Record<PlayerKey, Player> = reactive({
		p1: {
			id: "p1",
			isActive: true,
			isDealer: true,
			score: 0,
		},
		p2: {
			id: "p2",
			isActive: false,
			isDealer: false,
			score: 0,
		},
	});
	const bonusMultiplier = ref(1);

	// Getters
	const playerList = computed(() => [...Object.values(players)]);

	const activePlayer = computed(() => {
		const player = playerList.value.find((p) => p.isActive);
		if (!player) throw Error("No active player specified");
		return player;
	});

	const inactivePlayer = computed(() => {
		const player = playerList.value.find((p) => !p.isActive);
		if (!player) throw Error("Multiple active players detected");
		return player;
	});

	const dealer = computed(() => {
		const player = playerList.value.find((p) => p.isDealer);
		if (!player) throw Error("No dealer specified");
		return player;
	});

	const scoreboard = computed(() => {
		return {
			p1: players.p1.score,
			p2: players.p2.score,
		}
	})

	// Actions
	function toggleActivePlayer() {
		playerList.value.forEach((p) => (p.isActive = !p.isActive));
		console.debug("SWITCHED PLAYERS", players.p1.isActive ? "<<< P1" : ">>> P2");
	}

	function toggleDealer() {
		playerList.value.forEach((p) => (p.isDealer = !p.isDealer));
	}

	function incrementBonus() {
		bonusMultiplier.value++;
	}

	function updateScore(player: PlayerKey, amount: number) {
		players[player].score += amount * bonusMultiplier.value;
	}

  function reset(newDealer?: PlayerKey | null) {
    // players.p1.score = 0;
    // players.p2.score = 0;
    bonusMultiplier.value = 1;
	if (newDealer) {
		playerList.value.forEach(p => {
			p.isDealer = p.id === newDealer
			p.isActive = p.id === newDealer
		})
	}
  }

	return {
		// State
		players,
		bonusMultiplier,
		// Getters
		playerList,
		activePlayer,
		inactivePlayer,
		dealer,
		scoreboard,
		// Actions
		toggleActivePlayer,
		toggleDealer,
		incrementBonus,
		updateScore,
    reset,
	};
});
