/**
 * @fileoverview Player Store
 * 
 * Manages player-specific data and turn management for Hanafuda gameplay.
 * Handles player identification, active/inactive states, dealer rotation,
 * and bonus multipliers for scoring calculations.
 * 
 * Features:
 * - Two-player game support (p1, p2)
 * - Active player tracking and turn switching
 * - Dealer role management and rotation
 * - Bonus multiplier for koi-koi scoring
 * - Player name customization
 * - Serializable state for persistence
 * 
 * Player States:
 * - isActive: Currently taking their turn
 * - isDealer: Deals cards and goes first in new rounds
 * 
 * @example
 * ```typescript
 * const playerStore = usePlayerStore()
 * 
 * // Get current active player
 * const current = playerStore.activePlayer
 * console.log(`${current.name} is taking their turn`)
 * 
 * // Switch turns
 * playerStore.toggleActivePlayer()
 * 
 * // Set new dealer after round
 * playerStore.reset('p2') // p2 becomes new dealer
 * 
 * // Increment koi-koi bonus
 * playerStore.incrementBonus()
 * ```
 */

import { defineStore } from 'pinia'

/** Player identifier type */
export type PlayerKey = 'p1' | 'p2'

/** Player data structure */
export type Player = {
  /** Unique player identifier */
  readonly id: PlayerKey
  /** Display name for the player */
  name: string
  /** Whether this player is currently taking their turn */
  isActive: boolean
  /** Whether this player is the dealer (goes first) */
  isDealer: boolean
}

/** Complete player store state shape */
export interface PlayerStoreState {
  /** Player data for both players */
  players: Record<PlayerKey, Player>
  /** Koi-koi bonus multiplier for scoring */
  bonusMultiplier: number
}

export const usePlayerStore = defineStore('players', () => {
  // State
  const players: Record<PlayerKey, Player> = reactive({
    p1: {
      id: 'p1',
      name: 'Player 1',
      isActive: true,
      isDealer: true,
      // score: INITIAL_SCORE,
    },
    p2: {
      id: 'p2',
      name: 'Player 2',
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
  function getPlayerName(player: PlayerKey) {
    return players[player].name
  }

  function setPlayerName(player: PlayerKey, name: string) {
    players[player].name = name
  }

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

  function exportSerializedState(): string {
    const serializable = {
      players: { ...players },
      bonusMultiplier: bonusMultiplier.value
    }
    return JSON.stringify(serializable)
  }

  function importSerializedState(serializedState: string): boolean {
    try {
      const data = JSON.parse(serializedState)
      
      // Validate structure
      if (!data.players || typeof data.bonusMultiplier !== 'number') {
        throw new Error('Invalid player store state structure')
      }
      
      Object.assign(players, data.players)
      bonusMultiplier.value = data.bonusMultiplier
      
      return true
    } catch (error) {
      console.error('Failed to import player store state:', error)
      return false
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
    activeOpponent,
    // Actions
    toggleActivePlayer,
    toggleDealer,
    incrementBonus,
    getPlayerName,
    setPlayerName,
    // updateScore,
    reset,
    exportSerializedState,
    importSerializedState,
  }
})
