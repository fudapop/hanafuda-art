import { storeToRefs } from 'pinia'
import { useCardStore } from '~~/stores/cardStore'
import { useConfigStore } from '~~/stores/configStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { type CardName, CARDS, matchByMonth } from '~/utils/cards'
import { getProgress, viewingYaku, type YakuProgress } from '~/utils/yaku'

export const useCardHandler = () => {
  const cs = useCardStore()
  const ds = useGameDataStore()
  const config = useConfigStore()
  const { field, staged } = storeToRefs(cs)

  const useSelectedCard = (): Ref<CardName | null> => useState('selected', () => null)
  const useMatchedCards = () =>
    computed(() => {
      if (!selectedCard.value) return []
      return matchByMonth(
        // Exclude cards already staged for collection
        [...field.value].filter((card) => !staged.value.has(card)),
        selectedCard.value,
      )
    })

  const matchExists = (card?: CardName) => {
    if (!card) return !!matchedCards.value?.length
    return matchByMonth(
      [...field.value].filter((card) => !staged.value.has(card)),
      card,
    )
  }

  const getMatches = (card: CardName) => {
    return matchByMonth(
      [...field.value].filter((card) => !staged.value.has(card)),
      card,
    )
  }

  const rateProgress = (progress: YakuProgress[], restCards: CardName[]): number => {
    const filteredList = progress.filter((p) => !viewingYaku.has(p.yaku.name))
    switch (config.allowViewingsYaku) {
      case 'none':
        progress = filteredList

      case 'limited':
        if (filteredList.length) {
          // NOP -- is it okay to only start trying when the prerequisit is fulfilled?
        } else {
          progress = filteredList
        }

      case 'allow':
      // NOP
    }

    let score = 0
    for (const { yaku, collectedCards, gotPoints } of progress) {
      if (!!gotPoints) {
        score += gotPoints
      } else {
        // const rarity = yaku.cards.length / 48;
        const got = collectedCards.length / yaku.numRequired // [O, 1)  -- It's never 1 because then the Yaku check succeeds.

        const couldGet =
          yaku.find(new Set([...collectedCards, ...restCards])).length / yaku.numRequired // [O,1] -- Rarely >1 but let's pretend it's not.

        const gotCouldGet = got * couldGet // [O, 1)
        const payoff = yaku.points
        score += gotCouldGet * payoff // [O, payoff)
      }
    }
    return score
  }

  const rateDiscard = (card: CardName, restCards: CardName[]): number => {
    const theCard = CARDS[card]
    let discardPenality: number
    switch (theCard.type) {
      case 'bright':
        discardPenality = -20
        break
      case 'animal':
        discardPenality = -10
        break
      case 'ribbon':
        discardPenality = -5
        break
      case 'plain':
        discardPenality = -1
        break
    } // [-20, -1]
    let discardScore: number = matchByMonth(restCards, card).length / 3 // [0,1)
    return discardPenality + discardScore // [-20, 0)
  }

  const selectedCard = useSelectedCard()
  const matchedCards = useMatchedCards()

  const handleCardSelect = (card: CardName) => {
    // Player selecting a card from hand
    if (!selectedCard.value) {
      selectCardFromHand(card)
      return
    }
    // Player is selecting a match from the field
    if (matchedCards.value.includes(card)) {
      // Player selected a valid match
      matchSelection(card, selectedCard.value)
    } else {
      // Player is changing original selection
      selectCardFromHand(card)
    }
  }

  const handlePlayerDiscard = async () => {
    if (!selectedCard.value) return
    cs.discard(selectedCard.value, 'p1')
    ds.logPlayerAction(ds.getCurrent.player, 'discard', [selectedCard.value])
    selectedCard.value = null
  }

  const selectCardFromHand = (card: CardName) => {
    if (!cs.hand.p1.has(card)) return
    selectedCard.value = card
    // console.debug(ds.getCurrent.player.toUpperCase(), '>>> Selected', card.toUpperCase())
  }

  const matchSelection = (card: CardName, selected: CardName) => {
    if (!matchedCards.value.includes(card)) {
      // This should not be possible
      const errMsg = 'An unexpected error occurred during match selection.'
      console.error(errMsg, {
        selected: selectedCard.value,
        matched: matchedCards.value,
      })
      throw Error(errMsg)
    }
    // Player selected a valid match
    // console.debug('\tMatching:', matchedCards.value.join(', ').toUpperCase())
    if (matchedCards.value.length === 3) {
      // Collect the entire suit
      handleMatched([...matchedCards.value, selected])
    } else {
      // Player selects one match
      handleMatched([card, selected])
    }
  }

  const handleMatched = (matches: CardName[]) => {
    ds.logPlayerAction(ds.getCurrent.player, 'match', matches)
    cs.stageForCollection(matches)
    // Collect all matched card at the end of the turn;
    if (ds.checkCurrentPhase('draw')) {
      cs.collectCards(ds.getCurrent.player)
    }
    resetSelection()
    ds.nextPhase()
  }

  const resetSelection = () => {
    selectedCard.value = null
  }

  const useActions = () => ({
    select() {
      console.assert(
        ds.checkCurrentPhase('select'),
        `Phase check failed. Expected: 'select'; Received: '${ds.getCurrent.phase}'`,
      )
      const cardsInHand = [...cs.hand[ds.getCurrent.player]] // TODO put shuffle back?
      const handScores: number[] = Array(cardsInHand.length).fill(0)

      const collection = [...cs.collection[ds.getCurrent.player]]
      const opponentCollection = new Set([...cs.collection[ds.getCurrent.inactivePlayer]])

      cardsInHand.forEach((card, i) => {
        const restCards = cardsInHand.toSpliced(i, 1)
        const matches = getMatches(card)
        switch (matches.length) {
          case 0:
            handScores[i] = rateDiscard(card, restCards)
            return
          case 1:
          case 3: {
            const p = getProgress(new Set([card, ...matches, ...collection]), opponentCollection)
            handScores[i] = rateProgress(p, restCards)
            return
          }
          case 2: {
            const p0 = getProgress(new Set([card, matches[0], ...collection]), opponentCollection)
            const p1 = getProgress(new Set([card, matches[1], ...collection]), opponentCollection)
            handScores[i] = Math.max(rateProgress(p0, restCards), rateProgress(p1, restCards))
            return
          }
        }
      })

      const maxScoreIndex = handScores.reduce((iMax, x, i, arr) => (x > arr[iMax] ? i : iMax), 0)
      selectedCard.value = cardsInHand[maxScoreIndex]
    },

    matchOrDiscard() {
      const [selected, matches] = [selectedCard.value, matchedCards.value]
      if (!selected) return

      switch (matches.length) {
        case 0:
          cs.discard(selected, ds.getCurrent.player)
          ds.logPlayerAction(ds.getCurrent.player, 'discard', [selected])
          break
        case 1:
        case 3:
          cs.stageForCollection([...matches, selected])
          ds.logPlayerAction(ds.getCurrent.player, 'match', [selected, ...matches])
          break
        case 2:
          const cardsInHand = [...cs.hand[ds.getCurrent.player]]
          const collection = [...cs.collection[ds.getCurrent.player]]
          const opponentCollection = new Set([...cs.collection[ds.getCurrent.inactivePlayer]])
          const p0 = getProgress(new Set([selected, matches[0], ...collection]), opponentCollection)
          const p1 = getProgress(new Set([selected, matches[1], ...collection]), opponentCollection)
          const best = rateProgress(p0, cardsInHand) > rateProgress(p1, cardsInHand) ? 0 : 1
          cs.stageForCollection([matches[best], selected])
          ds.logPlayerAction(ds.getCurrent.player, 'match', [selected, matches[best]])
          break
      }
      selectedCard.value = null
      ds.nextPhase()
    },

    draw() {
      console.assert(
        ds.checkCurrentPhase('draw'),
        `Phase check failed. Expected: 'draw'; Received: '${ds.getCurrent.phase}'`,
      )
      selectedCard.value = cs.revealCard()
      ds.logPlayerAction(ds.getCurrent.player, 'draw', [selectedCard.value])
    },

    collect() {
      console.assert(
        ds.checkCurrentPhase('collect'),
        `Phase check failed. Expected: 'collect'; Received: '${ds.getCurrent.phase}'`,
      )
      if (cs.staged.size) cs.collectCards(ds.getCurrent.player)
    },
  })

  return readonly({
    useSelectedCard,
    useMatchedCards,
    handleCardSelect,
    handlePlayerDiscard,
    matchExists,
    useActions,
  })
}
