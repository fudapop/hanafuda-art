const DECK = [
  'matsu-ni-tsuru',
  'matsu-no-tan',
  'matsu-no-kasu-1',
  'matsu-no-kasu-2',
  'ume-ni-uguisu',
  'ume-no-tan',
  'ume-no-kasu-1',
  'ume-no-kasu-2',
  'sakura-ni-maku',
  'sakura-no-tan',
  'sakura-no-kasu-1',
  'sakura-no-kasu-2',
  'ayame-ni-yatsuhashi',
  'ayame-no-tan',
  'ayame-no-kasu-1',
  'ayame-no-kasu-2',
  'hagi-ni-inoshishi',
  'hagi-no-tan',
  'hagi-no-kasu-1',
  'hagi-no-kasu-2',
  'botan-ni-chou',
  'botan-no-tan',
  'botan-no-kasu-1',
  'botan-no-kasu-2',
  'fuji-ni-kakku',
  'fuji-no-tan',
  'fuji-no-kasu-1',
  'fuji-no-kasu-2',
  'susuki-ni-tsuki',
  'susuki-ni-kari',
  'susuki-no-kasu-1',
  'susuki-no-kasu-2',
  'kiku-ni-sakazuki',
  'kiku-no-tan',
  'kiku-no-kasu-1',
  'kiku-no-kasu-2',
  'momiji-ni-shika',
  'momiji-no-tan',
  'momiji-no-kasu-1',
  'momiji-no-kasu-2',
  'yanagi-ni-ono-no-toufuu',
  'yanagi-ni-tsubame',
  'yanagi-no-tan',
  'yanagi-no-kasu',
  'kiri-ni-ho-oh',
  'kiri-no-kasu-1',
  'kiri-no-kasu-2',
  'kiri-no-kasu-3',
] as const

const TEST_DECKS = {
  kuttsuki: [
    'matsu-no-kasu-1',
    'matsu-no-kasu-2',
    'ume-no-kasu-1',
    'ume-no-kasu-2',
    'botan-ni-chou',
    'sakura-no-kasu-1',
    'ayame-no-kasu-1',
    'hagi-ni-inoshishi',

    'ayame-no-kasu-2',
    'hagi-no-tan',
    'hagi-no-kasu-1',
    'hagi-no-kasu-2',
    'sakura-no-kasu-2',
    'botan-no-tan',
    'botan-no-kasu-1',
    'botan-no-kasu-2',

    'matsu-ni-tsuru',
    'matsu-no-tan',
    'ume-ni-uguisu',
    'ume-no-tan',
    'sakura-ni-maku',
    'sakura-no-tan',
    'ayame-ni-yatsuhashi',
    'ayame-no-tan',
  ] as CardName[],
  teshi: [
    'matsu-ni-tsuru',
    'matsu-no-tan',
    'matsu-no-kasu-1',
    'matsu-no-kasu-2',
    'ume-ni-uguisu',
    'ume-no-tan',
    'ume-no-kasu-1',
    'ayame-no-kasu-2',

    'ume-no-kasu-2',
    'hagi-no-tan',
    'hagi-no-kasu-1',
    'hagi-no-kasu-2',
    'sakura-no-kasu-2',
    'botan-no-tan',
    'botan-no-kasu-1',
    'botan-no-kasu-2',

    'hagi-ni-inoshishi',
    'botan-ni-chou',
    'sakura-ni-maku',
    'sakura-no-tan',
    'sakura-no-kasu-1',
    'ayame-ni-yatsuhashi',
    'ayame-no-tan',
    'ayame-no-kasu-1',
  ] as CardName[],
}

type CardName = (typeof DECK)[number] | 'card-back'

const CARD_TYPES = ['bright', 'animal', 'ribbon', 'plain'] as const

type CardType = (typeof CARD_TYPES)[number]

interface FlowerCard {
  name: CardName
  type: CardType
  month: number
}

const CARDS: Readonly<Record<string, FlowerCard>> = {
  'matsu-ni-tsuru': {
    name: 'matsu-ni-tsuru',
    type: 'bright',
    month: 1,
  },
  'matsu-no-tan': {
    name: 'matsu-no-tan',
    type: 'ribbon',
    month: 1,
  },
  'matsu-no-kasu-1': {
    name: 'matsu-no-kasu-1',
    type: 'plain',
    month: 1,
  },
  'matsu-no-kasu-2': {
    name: 'matsu-no-kasu-2',
    type: 'plain',
    month: 1,
  },
  'ume-ni-uguisu': {
    name: 'ume-ni-uguisu',
    type: 'animal',
    month: 2,
  },
  'ume-no-tan': {
    name: 'ume-no-tan',
    type: 'ribbon',
    month: 2,
  },
  'ume-no-kasu-1': {
    name: 'ume-no-kasu-1',
    type: 'plain',
    month: 2,
  },
  'ume-no-kasu-2': {
    name: 'ume-no-kasu-2',
    type: 'plain',
    month: 2,
  },
  'sakura-ni-maku': {
    name: 'sakura-ni-maku',
    type: 'bright',
    month: 3,
  },
  'sakura-no-tan': {
    name: 'sakura-no-tan',
    type: 'ribbon',
    month: 3,
  },
  'sakura-no-kasu-1': {
    name: 'sakura-no-kasu-1',
    type: 'plain',
    month: 3,
  },
  'sakura-no-kasu-2': {
    name: 'sakura-no-kasu-2',
    type: 'plain',
    month: 3,
  },
  'fuji-ni-kakku': {
    name: 'fuji-ni-kakku',
    type: 'animal',
    month: 4,
  },
  'fuji-no-tan': {
    name: 'fuji-no-tan',
    type: 'ribbon',
    month: 4,
  },
  'fuji-no-kasu-1': {
    name: 'fuji-no-kasu-1',
    type: 'plain',
    month: 4,
  },
  'fuji-no-kasu-2': {
    name: 'fuji-no-kasu-2',
    type: 'plain',
    month: 4,
  },
  'ayame-ni-yatsuhashi': {
    name: 'ayame-ni-yatsuhashi',
    type: 'animal',
    month: 5,
  },
  'ayame-no-tan': {
    name: 'ayame-no-tan',
    type: 'ribbon',
    month: 5,
  },
  'ayame-no-kasu-1': {
    name: 'ayame-no-kasu-1',
    type: 'plain',
    month: 5,
  },
  'ayame-no-kasu-2': {
    name: 'ayame-no-kasu-2',
    type: 'plain',
    month: 5,
  },
  'botan-ni-chou': {
    name: 'botan-ni-chou',
    type: 'animal',
    month: 6,
  },
  'botan-no-tan': {
    name: 'botan-no-tan',
    type: 'ribbon',
    month: 6,
  },
  'botan-no-kasu-1': {
    name: 'botan-no-kasu-1',
    type: 'plain',
    month: 6,
  },
  'botan-no-kasu-2': {
    name: 'botan-no-kasu-2',
    type: 'plain',
    month: 6,
  },
  'hagi-ni-inoshishi': {
    name: 'hagi-ni-inoshishi',
    type: 'animal',
    month: 7,
  },
  'hagi-no-tan': {
    name: 'hagi-no-tan',
    type: 'ribbon',
    month: 7,
  },
  'hagi-no-kasu-1': {
    name: 'hagi-no-kasu-1',
    type: 'plain',
    month: 7,
  },
  'hagi-no-kasu-2': {
    name: 'hagi-no-kasu-2',
    type: 'plain',
    month: 7,
  },
  'susuki-ni-tsuki': {
    name: 'susuki-ni-tsuki',
    type: 'bright',
    month: 8,
  },
  'susuki-ni-kari': {
    name: 'susuki-ni-kari',
    type: 'animal',
    month: 8,
  },
  'susuki-no-kasu-1': {
    name: 'susuki-no-kasu-1',
    type: 'plain',
    month: 8,
  },
  'susuki-no-kasu-2': {
    name: 'susuki-no-kasu-2',
    type: 'plain',
    month: 8,
  },
  'kiku-ni-sakazuki': {
    name: 'kiku-ni-sakazuki',
    type: 'animal',
    month: 9,
  },
  'kiku-no-tan': {
    name: 'kiku-no-tan',
    type: 'ribbon',
    month: 9,
  },
  'kiku-no-kasu-1': {
    name: 'kiku-no-kasu-1',
    type: 'plain',
    month: 9,
  },
  'kiku-no-kasu-2': {
    name: 'kiku-no-kasu-2',
    type: 'plain',
    month: 9,
  },
  'momiji-ni-shika': {
    name: 'momiji-ni-shika',
    type: 'animal',
    month: 10,
  },
  'momiji-no-tan': {
    name: 'momiji-no-tan',
    type: 'ribbon',
    month: 10,
  },
  'momiji-no-kasu-1': {
    name: 'momiji-no-kasu-1',
    type: 'plain',
    month: 10,
  },
  'momiji-no-kasu-2': {
    name: 'momiji-no-kasu-2',
    type: 'plain',
    month: 10,
  },
  'yanagi-ni-ono-no-toufuu': {
    name: 'yanagi-ni-ono-no-toufuu',
    type: 'bright',
    month: 11,
  },
  'yanagi-ni-tsubame': {
    name: 'yanagi-ni-tsubame',
    type: 'animal',
    month: 11,
  },
  'yanagi-no-tan': {
    name: 'yanagi-no-tan',
    type: 'ribbon',
    month: 11,
  },
  'yanagi-no-kasu': {
    name: 'yanagi-no-kasu',
    type: 'plain',
    month: 11,
  },
  'kiri-ni-ho-oh': {
    name: 'kiri-ni-ho-oh',
    type: 'bright',
    month: 12,
  },
  'kiri-no-kasu-1': {
    name: 'kiri-no-kasu-1',
    type: 'plain',
    month: 12,
  },
  'kiri-no-kasu-2': {
    name: 'kiri-no-kasu-2',
    type: 'plain',
    month: 12,
  },
  'kiri-no-kasu-3': {
    name: 'kiri-no-kasu-3',
    type: 'plain',
    month: 12,
  },
}

function shuffle(deck: CardName[]): CardName[] {
  const cards = [...deck]
  let numberOfCards = () => cards.length
  let shuffledCards: CardName[] = []

  for (let n = 0; numberOfCards() > 0; n++) {
    let index = Math.floor(Math.random() * (numberOfCards() - 1))
    let randomCard = cards.splice(index, 1)
    if (randomCard[0]) shuffledCards.push(randomCard[0])
  }

  return shuffledCards
}

function getCardsOfType(cards: CardName[], cardType: CardType): CardName[] {
  return cards.filter((card) => CARDS[card]?.type === cardType)
}

function getCardsOfMonth(cards: CardName[], month: number): CardName[] {
  return cards.filter((card) => CARDS[card]?.month === month)
}

function sortByType(cards: CardName[]): Record<string, CardName[]> {
  return {
    brights: getCardsOfType(cards, 'bright'),
    animals: getCardsOfType(cards, 'animal'),
    ribbons: getCardsOfType(cards, 'ribbon'),
    plains: getCardsOfType(cards, 'plain'),
  }
}

function matchByMonth(cards: CardName[], matching: CardName): CardName[] {
  const matches = getCardsOfMonth(cards, CARDS[matching]?.month ?? 0)
  return matches
}

export {
  DECK,
  TEST_DECKS,
  CARDS,
  CARD_TYPES,
  type CardName,
  type CardType,
  type FlowerCard,
  shuffle,
  sortByType,
  matchByMonth,
  getCardsOfMonth,
  getCardsOfType,
}
