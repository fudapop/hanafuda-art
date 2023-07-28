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
  const decidingCall = useState("decision");

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
        await sleep(sleepTime*1.5);
      } catch (err) {
        console.error(err);
        endPlay();
        break;
      }
    }
  };

  const swap = () => {
    if (cs.handsEmpty) endPlay();
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
    while (decidingCall.value) {
      if (autoOpponent.value && gs.activePlayer.id === "p1") {
        console.log("Deciding...");
        await autoDecision();
        break;
      }
      console.log("Awaiting decision...");
      await sleep(1000);
    }
  };

  const autoDecision = async () => {
    const callChance = 25 + 10 * cs.hand.p2.size; // Max 95% for 7 cards in hand
    const koikoiCalled =
      cs.handNotEmpty("p2") && Math.floor(Math.random() * 100) < callChance;
    while (decidingCall.value) {
      // await sleep(2000);
      // TODO: Centralize handler functions
      if (koikoiCalled) {
        // handleKoiKoi
        gs.incrementBonus();
        decidingCall.value = false;
      } else {
        // handleStop
        abort.value = true;
        decidingCall.value = false;
        const result = gs.lastRoundResult;
        gs.endRound();
        console.log(
          ...Object.entries(result as Object).map(
            (arr) => arr.join(": ").toUpperCase() + "\n"
          )
        );
      }
    }
  };

  const endPlay = () => (abort.value = true);

  type AutoplayOptions = {
    speed?: speedMultiple;
    turns?: number;
    abortRef?: Ref<boolean>;
  };

  const autoPlay = async ({
    speed = 2,
    turns = Infinity,
    abortRef = useState("gameover"),
  }: AutoplayOptions) => {
    abort = abortRef;
    setPlaySpeed(speed);
    console.info("Running autoplay...");
    deal();
    await playRound(turns);
    console.info("Autoplay complete.");
  };

  const opponentPlay = async ({speed=1}: {speed: speedMultiple}) => {
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
