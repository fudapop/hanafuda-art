import { useCardStore } from "~/stores/cardStore";
import { useGlobalStore } from "~/stores/globalStore";
import { useCardHandler } from "~/composables/useCardHandler";
import { storeToRefs } from "pinia";
import { shuffle } from "~/scripts/cards";

const PLAY_SPEED = [0.75, 1, 1.25, 1.5, 2, 3] as const;

type speedMultiple = (typeof PLAY_SPEED)[number];

export const useAutoplay = () => {
  const cs = useCardStore();
  const gs = useGlobalStore();

  const { useSelectedCard, useMatchedCards, handleCardSelect, matchExists } =
    useCardHandler();
  const selectedCard = useSelectedCard();
  const matchedCards = useMatchedCards();

  const { activePlayer } = storeToRefs(gs);

  const useOpponent = () => useState("opponent", () => false);

  const autoOpponent = useOpponent();
  let abort: Ref<boolean> = useState("gameover");

  const { koikoiIsCalled, callKoikoi, stopIsCalled, callStop, decisionIsPending } =
    useDecisionHandler();

  let sleepTime = 1000;

  const setPlaySpeed = (multiple: speedMultiple) =>
    (sleepTime = 1000 / multiple);

  const deal = () => {
    cs.dealCards();
  };

  const match = () => {
    const [selected, matches] = [selectedCard.value, matchedCards.value];
    if (!selected || !matches?.length) return;

    const cards =
      matches.length === 3
        ? [...matches, selected]
        : [getRandom(matches), selected];
    cs.stageForCollection(cards);
    selectedCard.value = null;
    gs.nextPhase();
  };

  const discard = () => {
    if (!selectedCard.value) return;
    if (!matchedCards.value?.length) {
      cs.discard(selectedCard.value, activePlayer.value.id);
      selectedCard.value = null;
      gs.nextPhase();
    }
  };

  const ACTIONS = {
    select() {
      const cardsInHand = shuffle([...cs.hand[activePlayer.value.id]]);
      for (const card of cardsInHand) {
        if (matchExists(card)) {
          selectedCard.value = card;
          break;
        }
      }
    },

    matchOrDiscard() {
      switch (matchedCards.value?.length) {
        case 0:
          discard();
          break;
        default:
          match();
      }
    },

    draw() {
      selectedCard.value = cs.revealCard();
    },

    collect() {
      if (cs.staged.size) cs.collectCards(activePlayer.value.id);
    },
  } as const;

  const TURN = {
    select: ACTIONS.select,
    firstMatch: ACTIONS.matchOrDiscard,
    draw: ACTIONS.draw,
    secondMatch: ACTIONS.matchOrDiscard,
    collect: ACTIONS.collect,
  } as const;

  const playTurn = async () => {
    for (const func of Object.values(TURN)) {
      try {
        func();
        await sleep(sleepTime * 1.5);
      } catch (err) {
        console.error(err);
        endPlay();
        break;
      }
    }
  };

  const swap = () => {
    if (cs.handsEmpty) return endPlay();
    gs.toggleActivePlayer();
  };

  const playRound = async (turns?: number) => {
    const maxTurns = turns ?? Infinity;
    while (abort.value === false) {
      if (gs.turn > maxTurns) break;
      try {
        await playTurn();
        await autoDecision();
        await sleep(sleepTime);
        if (abort.value) break;
        swap();
      } catch (err) {
        console.error(err);
        endPlay();
        break;
      }
    }
  };

  const decision = async () => {
    while (decisionIsPending.value) {
      if (autoOpponent.value && gs.activePlayer.id === "p1") {
        console.log("Deciding...");
        await autoDecision();
        break;
      }
      console.log("Awaiting decision...");
      await sleep();
    }
  };

  const autoDecision = async () => {
    if (!decisionIsPending.value) return;
    const callChance = calcKoikoiChance();
    const koikoiCalled =
      cs.handNotEmpty("p2") && Math.floor(Math.random() * 100) < callChance;
    while (decisionIsPending.value) {
      await sleep(2000);
      if (koikoiCalled) {
        callKoikoi();
      } else {
        callStop();
      }
    }
  };

  const calcKoikoiChance = () => {
    const [player, opponent] = [gs.activePlayer.id, gs.inactivePlayer.id];
    let percentChance = 25;
    // Higher chance if player closer to yaku
    percentChance += 5 * cs.collection[player].size;
    // Lower chance if opponent closer to yaku
    percentChance += -5 * cs.collection[opponent].size;
    // Lower chance if koi-koi already called
    percentChance += koikoiIsCalled.value ? -25 : 0;
    // Drastically lower chance if hand almost empty
    percentChance += cs.hand[player].size < 2 ? -75 : 5 * cs.hand[player].size;

    console.debug(player.toUpperCase(), "is calculating...", {
      result: percentChance,
    });
    return percentChance;
  };

  const endPlay = () => (abort.value = true);

  type AutoplayOptions = {
    speed?: speedMultiple;
    turns?: number;
    rounds?: number;
    abortRef?: Ref<boolean>;
  };

  const autoPlay = async ({
    speed = 2,
    turns = Infinity,
    rounds = 1,
    abortRef = useState("gameover"),
  }: AutoplayOptions) => {
    abort = abortRef;
    setPlaySpeed(speed);
    console.info("Running autoplay...");
    let r = 0;
    while (r < rounds) {
      try {
        deal();
        await sleep();
        await playRound(turns);
        console.info("Ending round...");
        if (r < rounds) {
          r++;
          cs.reset();
          gs.nextRound();
        }
        await sleep(2000);
        abort.value = false;
      } catch (err) {
        console.error(err);
        break;
      }
    }
    console.info("Autoplay complete.");
  };

  const opponentPlay = async ({ speed = 1 }: { speed: speedMultiple }) => {
    // Wait if player is still handling decision modal
    await decision();
    // End play if player calls STOP
    if (abort.value || cs.handsEmpty) return;
    if (gs.activePlayer.id === "p2") {
      setPlaySpeed(speed);
      await sleep(sleepTime);
      await playTurn();
      await autoDecision();
      swap();
    } else {
      console.warn("Function 'opponentPlay' called while Player 1 is active.");
    }
  };

  return { autoPlay, opponentPlay, useOpponent, TURN };
};
