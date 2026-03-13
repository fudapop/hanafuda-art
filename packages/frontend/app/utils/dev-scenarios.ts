import type { GameResultsSnapshot, MatchStats } from '~/composables/useGameResultsSnapshot'
import type { CompletedYaku, YakuName } from '~/utils/yaku'
import type { RoundResult } from '~~/stores/gameDataStore'
import type { PlayerKey } from '~~/stores/playerStore'

export type DevScenario = {
  label: string
  description: string
  route: string
  snapshot: GameResultsSnapshot
}

const yaku = (name: YakuName, points: number, cards: string[] = []): CompletedYaku => ({
  name,
  cards: cards as CompletedYaku['cards'],
  points,
})

const round = (
  num: number,
  winner: PlayerKey | null,
  score: number,
  completedYaku?: CompletedYaku[],
): RoundResult => ({
  round: num,
  winner,
  score,
  completedYaku,
})

const stats = (overrides: Partial<MatchStats> = {}): MatchStats => ({
  totalYakuCompleted: 0,
  uniqueYakuTypes: [],
  koikoiCallsMade: 0,
  koikoiCallsSucceeded: 0,
  roundsWon: 0,
  roundsLost: 0,
  roundsDrawn: 0,
  bestRoundScore: 0,
  ...overrides,
})

export const DEV_SCENARIOS: Record<string, DevScenario> = {
  'results-decisive-win': {
    label: 'Decisive Win',
    description: '6 rounds, high score gap, multiple yaku (gokou, ino-shika-chou), koi-koi calls',
    route: '/results',
    snapshot: {
      outcome: 'win',
      selfKey: 'p1',
      opponentKey: 'p2',
      playerName: 'You',
      opponentName: 'CPU',
      selfScore: 42,
      opponentScore: 11,
      maxRounds: 6,
      isMultiplayer: false,
      timestamp: Date.now(),
      roundHistory: [
        round(1, 'p1', 15, [
          yaku('gokou', 15, [
            'matsu-ni-tsuru',
            'sakura-ni-maku',
            'susuki-ni-tsuki',
            'kiri-ni-ho-oh',
            'yanagi-ni-ono-no-toufuu',
          ]),
        ]),
        round(2, 'p2', 5, [yaku('hanami-zake', 5, ['sakura-ni-maku', 'kiku-ni-sakazuki'])]),
        round(3, 'p1', 10, [
          yaku('ino-shika-chou', 5, ['hagi-ni-inoshishi', 'momiji-ni-shika', 'botan-ni-chou']),
          yaku('aka-tan', 5, ['matsu-no-tan', 'ume-no-tan', 'sakura-no-tan']),
        ]),
        round(4, 'p1', 7, [
          yaku('ame-shikou', 7, [
            'matsu-ni-tsuru',
            'sakura-ni-maku',
            'susuki-ni-tsuki',
            'yanagi-ni-ono-no-toufuu',
          ]),
        ]),
        round(5, 'p2', 6, [yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'susuki-ni-tsuki'])]),
        round(6, 'p1', 10, [
          yaku('tsukimi-zake', 5, ['susuki-ni-tsuki', 'kiku-ni-sakazuki']),
          yaku('ao-tan', 5, ['botan-no-tan', 'kiku-no-tan', 'momiji-no-tan']),
        ]),
      ],
      matchStats: stats({
        totalYakuCompleted: 6,
        uniqueYakuTypes: ['gokou', 'ino-shika-chou', 'aka-tan', 'ame-shikou', 'tsukimi-zake', 'ao-tan'],
        koikoiCallsMade: 3,
        koikoiCallsSucceeded: 2,
        roundsWon: 4,
        roundsLost: 2,
        roundsDrawn: 0,
        bestRoundScore: 15,
      }),
    },
  },

  'results-close-loss': {
    label: 'Close Loss',
    description: '3 rounds, 1-point margin, player won 1 round',
    route: '/results',
    snapshot: {
      outcome: 'lose',
      selfKey: 'p1',
      opponentKey: 'p2',
      playerName: 'You',
      opponentName: 'CPU',
      selfScore: 6,
      opponentScore: 7,
      maxRounds: 3,
      isMultiplayer: false,
      timestamp: Date.now(),
      roundHistory: [
        round(1, 'p2', 1, [yaku('kasu', 1)]),
        round(2, 'p1', 6, [yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'susuki-ni-tsuki'])]),
        round(3, 'p2', 6, [yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'kiri-ni-ho-oh'])]),
      ],
      matchStats: stats({
        totalYakuCompleted: 1,
        uniqueYakuTypes: ['sankou'],
        koikoiCallsMade: 0,
        koikoiCallsSucceeded: 0,
        roundsWon: 1,
        roundsLost: 2,
        roundsDrawn: 0,
        bestRoundScore: 6,
      }),
    },
  },

  'results-draw': {
    label: 'Draw',
    description: '3 rounds, equal scores, all rounds drawn, zero yaku',
    route: '/results',
    snapshot: {
      outcome: 'draw',
      selfKey: 'p1',
      opponentKey: 'p2',
      playerName: 'You',
      opponentName: 'CPU',
      selfScore: 0,
      opponentScore: 0,
      maxRounds: 3,
      isMultiplayer: false,
      timestamp: Date.now(),
      roundHistory: [
        round(1, null, 0),
        round(2, null, 0),
        round(3, null, 0),
      ],
      matchStats: stats({
        roundsDrawn: 3,
      }),
    },
  },

  'results-multiplayer-win': {
    label: 'Multiplayer Win',
    description: '3 rounds, multiplayer mode — hides "Play Again" button',
    route: '/results',
    snapshot: {
      outcome: 'win',
      selfKey: 'p1',
      opponentKey: 'p2',
      playerName: 'You',
      opponentName: 'Rival',
      selfScore: 12,
      opponentScore: 5,
      maxRounds: 3,
      isMultiplayer: true,
      timestamp: Date.now(),
      roundHistory: [
        round(1, 'p1', 5, [
          yaku('ino-shika-chou', 5, ['hagi-ni-inoshishi', 'momiji-ni-shika', 'botan-ni-chou']),
        ]),
        round(2, 'p2', 5, [yaku('hanami-zake', 5, ['sakura-ni-maku', 'kiku-ni-sakazuki'])]),
        round(3, 'p1', 7, [
          yaku('ame-shikou', 7, [
            'matsu-ni-tsuru',
            'sakura-ni-maku',
            'susuki-ni-tsuki',
            'yanagi-ni-ono-no-toufuu',
          ]),
        ]),
      ],
      matchStats: stats({
        totalYakuCompleted: 2,
        uniqueYakuTypes: ['ino-shika-chou', 'ame-shikou'],
        koikoiCallsMade: 1,
        koikoiCallsSucceeded: 1,
        roundsWon: 2,
        roundsLost: 1,
        roundsDrawn: 0,
        bestRoundScore: 7,
      }),
    },
  },

  'results-many-rounds': {
    label: 'Many Rounds (12)',
    description: '12 rounds, max rounds, diverse yaku across rounds, exercises long round breakdown',
    route: '/results',
    snapshot: {
      outcome: 'win',
      selfKey: 'p1',
      opponentKey: 'p2',
      playerName: 'You',
      opponentName: 'CPU',
      selfScore: 48,
      opponentScore: 22,
      maxRounds: 12,
      isMultiplayer: false,
      timestamp: Date.now(),
      roundHistory: [
        round(1, 'p1', 5, [yaku('hanami-zake', 5, ['sakura-ni-maku', 'kiku-ni-sakazuki'])]),
        round(2, 'p2', 5, [yaku('tsukimi-zake', 5, ['susuki-ni-tsuki', 'kiku-ni-sakazuki'])]),
        round(3, 'p1', 1, [yaku('kasu', 1)]),
        round(4, null, 0),
        round(5, 'p1', 5, [
          yaku('aka-tan', 5, ['matsu-no-tan', 'ume-no-tan', 'sakura-no-tan']),
        ]),
        round(6, 'p2', 5, [
          yaku('ao-tan', 5, ['botan-no-tan', 'kiku-no-tan', 'momiji-no-tan']),
        ]),
        round(7, 'p1', 6, [yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'susuki-ni-tsuki'])]),
        round(8, 'p1', 15, [
          yaku('gokou', 15, [
            'matsu-ni-tsuru',
            'sakura-ni-maku',
            'susuki-ni-tsuki',
            'kiri-ni-ho-oh',
            'yanagi-ni-ono-no-toufuu',
          ]),
        ]),
        round(9, 'p2', 6, [yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'kiri-ni-ho-oh'])]),
        round(10, 'p1', 2, [yaku('tan-zaku', 2)]),
        round(11, 'p2', 6, [
          yaku('tane-zaku', 1),
          yaku('ino-shika-chou', 5, ['hagi-ni-inoshishi', 'momiji-ni-shika', 'botan-ni-chou']),
        ]),
        round(12, 'p1', 14, [
          yaku('shikou', 8, ['matsu-ni-tsuru', 'sakura-ni-maku', 'susuki-ni-tsuki', 'kiri-ni-ho-oh']),
          yaku('sankou', 6, ['matsu-ni-tsuru', 'sakura-ni-maku', 'susuki-ni-tsuki']),
        ]),
      ],
      matchStats: stats({
        totalYakuCompleted: 8,
        uniqueYakuTypes: ['hanami-zake', 'kasu', 'aka-tan', 'sankou', 'gokou', 'tan-zaku', 'shikou'],
        koikoiCallsMade: 4,
        koikoiCallsSucceeded: 3,
        roundsWon: 7,
        roundsLost: 4,
        roundsDrawn: 1,
        bestRoundScore: 15,
      }),
    },
  },
}
