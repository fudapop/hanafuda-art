import { type RoundResult, useGameDataStore } from '~~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~~/stores/playerStore'
import { useConfigStore } from '~~/stores/configStore'
import type { YakuName } from '~/utils/yaku'

export type MatchStats = {
  totalYakuCompleted: number
  uniqueYakuTypes: YakuName[]
  koikoiCallsMade: number
  koikoiCallsSucceeded: number
  roundsWon: number
  roundsLost: number
  roundsDrawn: number
  bestRoundScore: number
}

export type GameResultsSnapshot = {
  outcome: 'win' | 'lose' | 'draw'
  selfKey: PlayerKey
  opponentKey: PlayerKey
  playerName: string
  opponentName: string
  selfScore: number
  opponentScore: number
  roundHistory: RoundResult[]
  matchStats: MatchStats
  maxRounds: number
  isMultiplayer: boolean
  timestamp: number
}

export const useGameResultsSnapshot = () => {
  const snapshot = useState<GameResultsSnapshot | null>('game-results-snapshot', () => null)

  const captureSnapshot = () => {
    const ds = useGameDataStore()
    const ps = usePlayerStore()
    const config = useConfigStore()
    const { selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()

    const selfScore = ds.scoreboard[selfKey.value]
    const opponentScore = ds.scoreboard[opponentKey.value]

    const outcome: GameResultsSnapshot['outcome'] =
      selfScore === opponentScore ? 'draw' : selfScore > opponentScore ? 'win' : 'lose'

    // Derive match stats from roundHistory and eventHistory
    const selfRounds = ds.roundHistory.filter((r) => r.winner === selfKey.value)
    const allSelfYaku = selfRounds.flatMap((r) => r.completedYaku ?? [])
    const uniqueYakuNames = [...new Set(allSelfYaku.map((y) => y.name))]

    // Count koi-koi calls from event history
    const selfKoikoiEvents = ds.eventHistory.filter(
      (e) => e.type === 'player' && e.player === selfKey.value && e.action === 'koi-koi',
    )

    // A koi-koi call "succeeded" if the player ultimately won that round
    // We approximate by counting rounds won where the player called koi-koi
    const roundsWithKoikoi = new Set<number>()
    let currentRound = 1
    for (const event of ds.eventHistory) {
      if (event.type === 'system' && event.message.includes('Round')) {
        const match = event.message.match(/Round (\d+)/)
        if (match) currentRound = parseInt(match[1])
      }
      if (
        event.type === 'player' &&
        event.player === selfKey.value &&
        event.action === 'koi-koi'
      ) {
        roundsWithKoikoi.add(currentRound)
      }
    }
    const koikoiSucceeded = ds.roundHistory.filter(
      (r) => r.winner === selfKey.value && r.round && roundsWithKoikoi.has(r.round),
    ).length

    const matchStats: MatchStats = {
      totalYakuCompleted: allSelfYaku.length,
      uniqueYakuTypes: uniqueYakuNames,
      koikoiCallsMade: selfKoikoiEvents.length,
      koikoiCallsSucceeded: koikoiSucceeded,
      roundsWon: selfRounds.length,
      roundsLost: ds.roundHistory.filter((r) => r.winner === opponentKey.value).length,
      roundsDrawn: ds.roundHistory.filter((r) => r.winner === null).length,
      bestRoundScore: selfRounds.length > 0 ? Math.max(...selfRounds.map((r) => r.score)) : 0,
    }

    snapshot.value = {
      outcome,
      selfKey: selfKey.value,
      opponentKey: opponentKey.value,
      playerName: ps.players[selfKey.value].name,
      opponentName: ps.players[opponentKey.value].name,
      selfScore,
      opponentScore,
      roundHistory: JSON.parse(JSON.stringify(ds.roundHistory)),
      matchStats,
      maxRounds: config.maxRounds,
      isMultiplayer: isMultiplayerGame.value,
      timestamp: Date.now(),
    }
  }

  const clearSnapshot = () => {
    snapshot.value = null
  }

  return {
    snapshot,
    captureSnapshot,
    clearSnapshot,
  }
}
