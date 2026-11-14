import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCardHandler } from '~/composables/useCardHandler'
import { matchByMonth, type CardName } from '~/utils/cards'
import { useCardStore } from '../cardStore'
import { useGameDataStore } from '../gameDataStore'
import type { PlayerKey } from '../playerStore'

/**
 * Play the current player's selected card, then advance one phase.
 * One full turn is: hand card, draw, drawn card, collect, advance.
 */
function playSelected(card: CardName) {
  const cs = useCardStore()
  const ds = useGameDataStore()
  const player = ds.getCurrent.player as PlayerKey
  const matches = matchByMonth(
    [...cs.field].filter((fieldCard) => !cs.staged.has(fieldCard)),
    card,
  )

  if (matches.length === 1 || matches.length === 3) {
    cs.stageForCollection([card, ...matches])
  } else if (matches.length === 2) {
    cs.stageForCollection([card, matches[0]!])
  } else {
    cs.discard(card, player)
  }
  ds.nextPhase()
}

describe('deck exhaustion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ends the round in a draw when both hands are empty, with cards still in the deck', () => {
    const cs = useCardStore()
    const ds = useGameDataStore()
    const { draw } = useCardHandler().useActions()

    ds.startRound()
    expect(cs.hand.p1.size).toBe(8)
    expect(cs.hand.p2.size).toBe(8)
    expect(cs.deck.size).toBe(24)

    let safety = 0
    while (!ds.roundOver && safety < 40) {
      safety++
      const player = ds.getCurrent.player as PlayerKey
      const [card] = [...cs.hand[player]]
      if (!card) break
      playSelected(card)
      if (ds.roundOver) break

      expect(() => draw()).not.toThrow()
      if (ds.roundOver) break

      const revealed = useCardHandler().useSelectedCard().value
      expect(revealed).toBeTruthy()
      playSelected(revealed!)
      if (ds.roundOver) break

      if (cs.staged.size) cs.collectCards(ds.getCurrent.player)
      ds.nextPhase()
    }

    // 8 cards each. Turn 9 is the next select, which used to keep drawing.
    // The leftover deck (8 cards) was then emptied over the following turns,
    // and the next draw threw "No card revealed" around turn 13.
    expect(ds.roundOver).toBe(true)
    expect(ds.getCurrent.result?.winner).toBeNull()
    expect(ds.getCurrent.result?.score).toBe(0)
    expect(ds.turnCounter).toBe(9)
    expect(cs.handsEmpty).toBe(true)
    expect(cs.deck.size).toBe(8)
    expect(() => draw()).not.toThrow()
  })

  it('ends the round instead of throwing when a draw finds an empty deck', () => {
    const cs = useCardStore()
    const ds = useGameDataStore()
    const { draw } = useCardHandler().useActions()

    ds.startRound()
    ds.nextPhase()
    expect(ds.checkCurrentPhase('draw')).toBe(true)
    cs.deck.clear()

    expect(() => draw()).not.toThrow()
    expect(ds.roundOver).toBe(true)
    expect(ds.exhaustedDraw).toBe(true)
    expect(ds.getCurrent.result?.winner).toBeNull()
  })
})
