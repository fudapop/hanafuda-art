import { useCardStore } from '~/stores/cardStore'
import { usePlayerStore } from '~/stores/playerStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { useCardHandler } from '~/composables/useCardHandler'
import { storeToRefs } from 'pinia'

const PLAY_SPEED = [0.75, 1, 1.25, 1.5, 2, 3] as const

type speedMultiple = (typeof PLAY_SPEED)[number]

type AutoplayOptions = {
  speed?: speedMultiple
  turns?: number
  rounds?: number
}

export const useAutoplay = () => {
  const cs = useCardStore()
  const ps = usePlayerStore()
  const ds = useGameDataStore()

  const { select, matchOrDiscard, draw, collect } = useCardHandler().useActions()

  const { errorOnTimeout } = useTimeout()

  const useOpponent = () => useState('opponent', () => false)

  const autoOpponent = useOpponent()
  const abort: Ref<boolean> = storeToRefs(ds).roundOver

  const { koikoiIsCalled, callKoikoi, callStop, decisionIsPending } = useDecisionHandler()

  let sleepTime = 1000

  const setPlaySpeed = (multiple: speedMultiple) => (sleepTime = 1000 / multiple)

  const autoPlay = async ({ speed = 2, turns = Infinity, rounds = 1 }: AutoplayOptions) => {
    setPlaySpeed(speed)
    console.info('Running autoplay...')
    let r = 0
    while (r < rounds && !ds.gameOver) {
      try {
        ds.startRound()
        await sleep()
        await playRound(turns)
        console.info('Ending round...')
        ds.endRound()
        r++
        if (r > rounds || ds.pointsExhausted) {
          break
        }
        ds.nextRound()
        await sleep(2000)
        abort.value = false
      } catch (err) {
        console.error(err)
        break
      }
    }
    console.info('Autoplay complete.')
    ds.gameOver = true
  }

  const opponentPlay = async ({ speed = 1 }: { speed: speedMultiple }) => {
    errorOnTimeout(
      async () => {
        // Wait if player is still handling decision modal
        await decision()
        // End play if player calls STOP
        if (abort.value || cs.handsEmpty) return
        if (ds.getCurrent.player === 'p2') {
          setPlaySpeed(speed)
          await sleep(sleepTime)
          await playTurn()
          await autoDecision()
          // swap();
        } else {
          console.warn("Function 'opponentPlay' called while Player 1 is active.")
        }
      },
      10000,
      'opponent-play',
      {
        callback: () => {
          // TODO: Gracefully handle errors
          ds.endRound()
          ds.gameOver = true
        },
        startMsg: 'Opponent playing...',
        endMsg: 'Opponent turn finished.',
      },
    )()
  }

  const playRound = async (turns?: number) => {
    const maxTurns = turns ?? Infinity
    while (abort.value === false) {
      if (ds.getCurrent.turn > maxTurns) break
      try {
        await playTurn()
        await autoDecision()
        await sleep(sleepTime)
        if (abort.value) break
        // swap();
      } catch (err) {
        console.error(err)
        endPlay()
        break
      }
    }
  }

  const playTurn = async () => {
    for (const func of Object.values(TURN)) {
      if (abort.value) break
      try {
        func()
        await sleep(sleepTime * 2)
      } catch (err) {
        console.error(err)
        endPlay()
        break
      }
    }
  }

  const TURN = {
    select: select,
    firstMatch: matchOrDiscard,
    draw: draw,
    secondMatch: matchOrDiscard,
    collect: collect,
  } as const

  const decision = async () => {
    while (decisionIsPending.value) {
      if (autoOpponent.value && ds.getCurrent.player === 'p1') {
        console.log('Deciding...')
        await autoDecision()
        break
      }
      console.log('Awaiting decision...')
      await sleep()
    }
  }

  const autoDecision = async () => {
    if (!decisionIsPending.value) {
      ds.nextPhase()
      return
    }
    const callChance = calcKoikoiChance()
    const koikoiCalled = cs.handNotEmpty('p2') && Math.floor(Math.random() * 100) < callChance
    while (decisionIsPending.value) {
      await sleep(2000)
      if (koikoiCalled) {
        callKoikoi()
      } else {
        callStop()
      }
    }
    ds.nextPhase()
  }

  const calcKoikoiChance = () => {
    const [player, opponent] = [ps.activePlayer.id, ps.inactivePlayer.id]
    let percentChance = 25
    // Higher chance if player closer to yaku
    percentChance += 5 * cs.collection[player].size
    // Lower chance if opponent closer to yaku
    percentChance += -5 * cs.collection[opponent].size
    // Lower chance if koi-koi already called
    percentChance += koikoiIsCalled.value ? -25 : 0
    // Drastically lower chance if hand almost empty
    percentChance += cs.hand[player].size < 2 ? -75 : 5 * cs.hand[player].size

    console.debug(player.toUpperCase(), 'is calculating...', {
      result: percentChance,
    })
    return percentChance
  }

  const endPlay = () => (abort.value = true)

  return { autoPlay, opponentPlay, useOpponent, TURN }
}
