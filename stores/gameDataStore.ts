/**
 * @fileoverview Game Data Store
 *
 * Coordinates the overall game flow and state management for Hanafuda gameplay.
 * Manages rounds, turns, phases, scoring, and game progression while working
 * in harmony with other stores to maintain consistent game state.
 *
 * Features:
 * - Turn-based game flow management (select → draw → collect phases)
 * - Round and match progression tracking
 * - Score calculation and history maintenance
 * - Game state transitions and validation
 * - Unique game session identification
 * - Serializable state for save/load functionality
 *
 * Game Flow:
 * 1. Select Phase: Player chooses card from hand
 * 2. Draw Phase: Card drawn from deck
 * 3. Collect Phase: Matching cards collected, yaku calculated
 *
 * @example
 * ```typescript
 * const gameData = useGameDataStore()
 *
 * // Start new round
 * gameData.startRound()
 *
 * // Progress through phases
 * gameData.nextPhase() // select → draw → collect → select...
 *
 * // Check current state
 * const current = gameData.getCurrent
 * console.log(`Round ${current.round}, Turn ${current.turn}, Phase: ${current.phase}`)
 *
 * // End round with results
 * gameData.saveResult({ winner: 'p1', score: 15 })
 * gameData.endRound()
 * ```
 */

import { defineStore } from 'pinia'
import { useCardStore } from '~/stores/cardStore'
import { useConfigStore } from '~/stores/configStore'
import { type PlayerKey, usePlayerStore } from '~/stores/playerStore'
import type { CardName } from '~/utils/cards'
import { consoleLogColor, getRandomString } from '~/utils/myUtils'
import type { CompletedYaku, YakuName } from '~/utils/yaku'

/** Result data for a completed round */
export type RoundResult = {
  [x: string]: unknown
  /** Round number */
  round?: number
  /** Winning player or null for draw */
  winner: PlayerKey | null
  /** Points scored in this round */
  score: number
  /** Completed yaku in this round */
  completedYaku?: CompletedYaku[]
}

// Simplified logging system - just two event types
export type EventLog = PlayerEventLog | SystemEventLog

/** Event for player actions */
export interface PlayerEventLog {
  type: 'player'
  player: PlayerKey
  action: 'discard' | 'match' | 'draw' | 'stop' | 'koi-koi' | 'complete'
  cards: CardName[]
  yaku?: YakuName
  timestamp: number
}

/** Event for system messages */
export interface SystemEventLog {
  type: 'system'
  message: string
  timestamp: number
}

/** Valid turn phases in order */
const PHASES = ['select', 'draw', 'collect'] as const

/** Current phase of the turn */
type TurnPhase = (typeof PHASES)[number]

/** Complete game data store state shape */
export interface GameDataStoreState {
  /** Unique identifier for this game session */
  gameId: string
  /** History of all completed rounds */
  roundHistory: RoundResult[]
  /** Current round number (1-based) */
  roundCounter: number
  /** Current turn number within round (1-based) */
  turnCounter: number
  /** Current turn phase */
  turnPhase: TurnPhase
  /** Whether current round has ended */
  roundOver: boolean
  /** Whether entire game/match has ended */
  gameOver: boolean
  /** History of all actions taken in the game */
  eventHistory: EventLog[]
}
export const useGameDataStore = defineStore('gameData', () => {
  // State
  const gameId = ref(getRandomString(28))
  const roundHistory: Ref<RoundResult[]> = ref([])
  const roundCounter = ref(roundHistory.value.length + 1)
  const turnCounter = ref(1)
  const turnPhase = ref('select' as TurnPhase)
  const roundOver = ref(false)
  const gameOver = ref(false)
  const eventHistory = reactive<EventLog[]>([])

  // Getters
  const getCurrent = computed(() => ({
    round: roundCounter.value,
    turn: turnCounter.value,
    phase: turnPhase.value,
    player: usePlayerStore().activePlayer.id,
    playerName: usePlayerStore().activePlayer.name,
    inactivePlayer: usePlayerStore().inactivePlayer.id,
    result: roundHistory.value[roundCounter.value - 1],
  }))

  const getPreviousResult = computed(() => roundHistory.value.at(-1))

  const scoreboard = computed(() => {
    const baseScore = 10 * useConfigStore().maxRounds
    const maxScore = baseScore * 2
    const calcScore = (player: PlayerKey) => {
      return roundHistory.value
        .filter((result) => result.winner === player)
        .reduce((total, result) => total + (result?.score ?? 0), 0)
    }
    const limitScore = (score: number) => {
      if (score < 0) return 0
      if (score > maxScore) return maxScore
      return score
    }

    let p1Score = limitScore(baseScore + calcScore('p1') - calcScore('p2'))
    let p2Score = limitScore(baseScore + calcScore('p2') - calcScore('p1'))
    return {
      p1: p1Score,
      p2: p2Score,
    }
  })

  const pointsExhausted = computed(() => scoreboard.value.p1 === 0 || scoreboard.value.p2 === 0)

  // Actions
  const logPlayerAction = (
    player: PlayerKey,
    action: PlayerEventLog['action'],
    cards: CardName[] = [],
    yaku?: YakuName,
  ) => {
    const log: PlayerEventLog = {
      type: 'player',
      player,
      action,
      cards,
      yaku,
      timestamp: Math.floor(Date.now() / 1000),
    }
    eventHistory.push(log)
  }

  const logSystemMessage = (message: string) => {
    const log: SystemEventLog = {
      type: 'system',
      message,
      timestamp: Math.floor(Date.now() / 1000),
    }
    eventHistory.push(log)
  }
  function nextPhase() {
    // Loop through phases; select -> draw -> select -> etc...
    const i = (PHASES.indexOf(turnPhase.value) + 1) % PHASES.length
    turnPhase.value = PHASES[i]
    // console.debug("SWITCHED PHASE >>>", getCurrent.value.phase);
    if (turnPhase.value === 'select') {
      usePlayerStore().toggleActivePlayer()
      if (usePlayerStore().activePlayer.isDealer) _incrementTurn()
    }
    return PHASES[i]
  }

  function checkCurrentPhase(phase: TurnPhase) {
    return turnPhase.value === phase
  }

  function startRound() {
    if (roundOver.value) {
      console.error("Failed to start game. State variable ('roundOver') not reset.")
      return
    }
    turnPhase.value = PHASES[0]
    turnCounter.value = 1
    roundCounter.value = roundHistory.value.length + 1
    useCardStore().dealCards()
    logSystemMessage(`START ROUND ${roundCounter.value}`)
  }

  function saveResult(result: RoundResult) {
    const round = roundCounter.value
    const index = round - 1
    roundHistory.value[index] = { round, ...result }
    return getResult(round)
  }

  function endRound() {
    if (!getCurrent.value.result)
      saveResult({
        round: roundCounter.value,
        winner: null,
        score: 0,
      })
    roundOver.value = true
    if (roundCounter.value >= useConfigStore().maxRounds || pointsExhausted.value) {
      gameOver.value = true
    }
    const winner = getCurrent.value.result?.winner
    logSystemMessage(`END ROUND ${roundCounter.value}${winner ? ` - Winner: ${winner}` : ''}`)
  }

  function nextRound() {
    const { winner } = getCurrent.value.result
    usePlayerStore().reset(winner)
    useCardStore().reset()
    roundOver.value = false
  }

  function getResult(roundNum: number) {
    const index = roundNum - 1
    const result = roundHistory.value[index]
    if (!result) {
      console.warn(`No results found for Round ${roundNum}.`)
    }
    return result
  }

  function generateGameId() {
    gameId.value = getRandomString(28)
    return gameId.value
  }

  function reset() {
    roundCounter.value = 1
    turnCounter.value = 1
    turnPhase.value = 'select'
    roundOver.value = false
    gameOver.value = false
    eventHistory.splice(0, eventHistory.length)
    const record = JSON.stringify(roundHistory.value.splice(0))
    return record
  }

  function _incrementTurn() {
    turnCounter.value++
    consoleLogColor(`TURN ${turnCounter.value}`, 'gray')
  }

  function exportSerializedState(): string {
    const serializable = {
      gameId: gameId.value,
      roundHistory: [...roundHistory.value],
      roundCounter: roundCounter.value,
      turnCounter: turnCounter.value,
      turnPhase: turnPhase.value,
      roundOver: roundOver.value,
      gameOver: gameOver.value,
      eventHistory: [...eventHistory],
    }
    return JSON.stringify(serializable)
  }

  function importSerializedState(serializedState: string): boolean {
    try {
      const data = JSON.parse(serializedState)

      // Validate structure
      if (typeof data.gameId !== 'string' || !Array.isArray(data.roundHistory)) {
        throw new Error('Invalid game data store state structure')
      }

      gameId.value = data.gameId
      roundHistory.value.splice(0, roundHistory.value.length, ...data.roundHistory)
      roundCounter.value = data.roundCounter || 1
      turnCounter.value = data.turnCounter || 1
      turnPhase.value = data.turnPhase || 'select'
      roundOver.value = data.roundOver || false
      gameOver.value = data.gameOver || false
      eventHistory.splice(0, eventHistory.length, ...data.eventHistory)
      return true
    } catch (error) {
      console.error('Failed to import game data store state:', error)
      return false
    }
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
    eventHistory,
    // Getters
    getCurrent,
    getPreviousResult,
    scoreboard,
    pointsExhausted,
    // Actions
    logPlayerAction,
    logSystemMessage,
    nextPhase,
    checkCurrentPhase,
    startRound,
    saveResult,
    endRound,
    nextRound,
    generateGameId,
    reset,
    exportSerializedState,
    importSerializedState,
  }
})
