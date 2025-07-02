import { defineStore } from 'pinia'

export type PlayerKey = 'p1' | 'p2'

export type Player = {
  readonly id: PlayerKey
  isActive: boolean
  isDealer: boolean
  // score: number;
}

// const INITIAL_SCORE = 30;

export const usePlayerStore = defineStore('players', () => {
  // State
  const players: Record<PlayerKey, Player> = reactive({
    p1: {
      id: 'p1',
      isActive: true,
      isDealer: true,
      // score: INITIAL_SCORE,
    },
    p2: {
      id: 'p2',
      isActive: false,
      isDealer: false,
      // score: INITIAL_SCORE,
    },
  })
  const bonusMultiplier = ref(1)

  // Getters
  const playerList = computed(() => [...Object.values(players)])

  const activePlayer = computed(() => {
    const player = playerList.value.find((p) => p.isActive)
    if (!player) throw Error('No active player specified')
    return player
  })

  const inactivePlayer = computed(() => {
    const player = playerList.value.find((p) => !p.isActive)
    if (!player) throw Error('Multiple active players detected')
    return player
  })

  const dealer = computed(() => {
    const player = playerList.value.find((p) => p.isDealer)
    if (!player) throw Error('No dealer specified')
    return player
  })

  const activeOpponent = computed(() => (player: PlayerKey) => players[player])

  // const winningPlayer = computed(() => {
  // 	const { p1, p2 } = players;
  // 	if (p1.score > p2.score) return p1.id;
  // 	if (p1.score < p2.score) return p2.id;
  // 	return null;
  // })

  // Actions
  function toggleActivePlayer() {
    playerList.value.forEach((p) => (p.isActive = !p.isActive))
    // console.debug("SWITCHED PLAYERS", players.p1.isActive ? "<<< P1" : ">>> P2");
  }

  function toggleDealer() {
    playerList.value.forEach((p) => (p.isDealer = !p.isDealer))
  }

  function incrementBonus() {
    bonusMultiplier.value++
  }

  // function updateScore(player: PlayerKey, amount: number) {
  // 	const points = amount * bonusMultiplier.value;
  // 	const opponent = activeOpponent.value(player);
  // 	players[player].score += points;
  // 	if (players[player].score > 60) opponent.score = 60;
  // 	opponent.score -= points;
  // 	if (opponent.score < 0) opponent.score = 0;
  // }

  function reset(newDealer?: PlayerKey | null) {
    bonusMultiplier.value = 1
    // newDealer = newDealer ?? winningPlayer.value;
    if (newDealer) {
      playerList.value.forEach((p) => {
        p.isDealer = p.id === newDealer
        p.isActive = p.id === newDealer
      })
    }
    // console.debug("Set new dealer:", { newDealer, active: activePlayer.value })
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
    activeOpponent,
    // Actions
    toggleActivePlayer,
    toggleDealer,
    incrementBonus,
    // updateScore,
    reset,
  }
})
