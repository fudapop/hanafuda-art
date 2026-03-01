import type { SerializedGameState } from '~/composables/useStoreManager'
import type { PlayerEventLog, EventLog } from '~~/stores/gameDataStore'
import type { CardName } from '~/utils/cards'
import type { PlayerKey } from '~~/stores/playerStore'
import { useCardStore } from '~~/stores/cardStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'

const REPLAY_STEP_DELAY = 1000
const CARD_REVEAL_DELAY = 500

export const useOpponentReplay = () => {
  const isReplaying = useState('opponent-replay-active', () => false)

  const cs = useCardStore()
  const ds = useGameDataStore()
  const ps = usePlayerStore()

  const { useSelectedCard } = useCardHandler()
  const selectedCard = useSelectedCard()

  /**
   * Extract new player events from a remote state by diffing against local event history.
   */
  const extractNewPlayerEvents = (remoteState: SerializedGameState): PlayerEventLog[] => {
    try {
      const parsedGameData = JSON.parse(remoteState.gameData) as {
        eventHistory?: EventLog[]
      }
      const remoteHistory = parsedGameData.eventHistory ?? []
      const localLength = ds.eventHistory.length
      const newEvents = remoteHistory.slice(localLength)
      return newEvents.filter((e): e is PlayerEventLog => e.type === 'player')
    } catch (error) {
      console.error('[useOpponentReplay] Failed to parse remote event history:', error)
      return []
    }
  }

  /**
   * Determine whether we should replay the opponent's turn rather than direct-syncing.
   */
  const shouldReplayTurn = (
    remoteState: SerializedGameState,
  ): boolean => {
    if (isReplaying.value) return false
    if (ds.roundOver || ds.gameOver) return false

    const newPlayerEvents = extractNewPlayerEvents(remoteState)
    return newPlayerEvents.length > 0
  }

  /**
   * Replay a single player event by executing the corresponding card store operations.
   */
  const replayEvent = async (event: PlayerEventLog) => {
    const player = event.player as PlayerKey

    switch (event.action) {
      case 'draw': {
        // Show the drawn card as selected (it's the top of the deck)
        const drawnCard = event.cards[0]
        if (drawnCard) {
          selectedCard.value = drawnCard
        }
        ds.logPlayerAction(player, 'draw', event.cards)
        break
      }

      case 'match': {
        const cards = event.cards as CardName[]
        // Set the primary card as selected for visual feedback
        if (cards[0]) {
          selectedCard.value = cards[0]
        }
        // Allow a render frame for the card reveal animation during select phase
        if (ds.checkCurrentPhase('select')) await sleep(CARD_REVEAL_DELAY)
        ds.logPlayerAction(player, 'match', cards, event.yaku)
        cs.stageForCollection(cards)
        // During draw phase, collect immediately (same as handleMatched)
        if (ds.checkCurrentPhase('draw')) {
          cs.collectCards(player)
        }
        selectedCard.value = null
        ds.nextPhase()
        break
      }

      case 'discard': {
        const card = event.cards[0]
        if (card) {
          selectedCard.value = card
          // Allow a render frame for the card reveal animation during select phase
          if (ds.checkCurrentPhase('select')) await sleep(CARD_REVEAL_DELAY)
          ds.logPlayerAction(player, 'discard', [card])
          cs.discard(card, player)
          selectedCard.value = null
          // After a discard during select phase, advance to draw
          // After a discard during draw phase, advance to collect (then to next player's select)
          ds.nextPhase()
        }
        break
      }

      case 'koi-koi': {
        ds.logPlayerAction(player, 'koi-koi')
        break
      }

      case 'stop': {
        ds.logPlayerAction(player, 'stop')
        break
      }

      case 'complete': {
        ds.logPlayerAction(player, 'complete', event.cards, event.yaku)
        break
      }
    }
  }

  /**
   * Replay the opponent's turn step-by-step, then reconcile with the final remote state.
   */
  const replayOpponentTurn = async (
    remoteState: SerializedGameState,
    deserializeGameState: (state: SerializedGameState) => Promise<boolean>,
  ): Promise<void> => {
    const newPlayerEvents = extractNewPlayerEvents(remoteState)
    if (newPlayerEvents.length === 0) return

    isReplaying.value = true
    console.info('[useOpponentReplay] Replaying opponent turn', {
      eventCount: newPlayerEvents.length,
    })

    try {
      for (const event of newPlayerEvents) {
        await replayEvent(event)
        await sleep(REPLAY_STEP_DELAY)
      }
    } catch (error) {
      console.error('[useOpponentReplay] Error during replay, reconciling:', error)
    } finally {
      // Always reconcile with the authoritative remote state
      selectedCard.value = null
      await deserializeGameState(remoteState)
      isReplaying.value = false
      console.info('[useOpponentReplay] Replay complete')
    }
  }

  return {
    isReplaying: readonly(isReplaying),
    shouldReplayTurn,
    replayOpponentTurn,
  }
}
