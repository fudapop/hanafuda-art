import { useCardStore } from "~/stores/cardStore";
import { useGlobalStore } from "~/stores/globalStore";
import { useCardHandler } from "~/composables/useCardHandler";
import { storeToRefs } from "pinia";

export const useAutoplay = () => {
  const cs = useCardStore();
  const gs = useGlobalStore();

  const { useSelectedCard, useMatchedCards } = useCardHandler();
  const selectedCard = useSelectedCard();
  const matchedCards = useMatchedCards();

  const { activePlayer } = storeToRefs(gs);
  function getRandom<T>(arr: Array<T>): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function sleep(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const gameOver = useState("gameover");

  let sleepTime = 100;

  const setPlaySpeed = (multiple: 1 | 2 | 3) => sleepTime = 1000/multiple;

  const deal = () => cs.dealCards();

  const select = () => {
    selectedCard.value = getRandom([...cs.hand[activePlayer.value.id]]);
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

  const collect = () => {
    if (cs.staged.size) cs.collectCards(activePlayer.value.id);
  };

  const discard = () => {
    if (!selectedCard.value) return;
    if (!matchedCards.value?.length) {
      cs.discard(selectedCard.value, activePlayer.value.id);
      selectedCard.value = null;
      gs.nextPhase();
    }
  };

  const draw = () => (selectedCard.value = cs.revealCard());

  const swap = () => {
    gs.toggleActivePlayer();
    if (cs.hand[activePlayer.value.id].size === 0) endPlay();
  };

  const STEPS: Function[] = [
    select,
    match,
    discard,
    draw,
    match,
    discard,
    collect,
  ];

  const playSteps = async (steps: Function[]) => {
    for (const func of steps) {
      try {
        func();
        await sleep(sleepTime);
      } catch (err) {
        console.error(err);
        endPlay();
        break;
      }
    }
  };

  const playRound = async () => {
    while (gameOver.value === false) {
      try {
        await playSteps(STEPS);
        await decision();
        if (gameOver.value) break;
        await sleep(sleepTime);
        swap();
      } catch (err) {
        console.error(err);
        endPlay();
        break;
      }
    }
  };

  const decision = async () => {
    while (useState("decision").value) {
      console.log("Awaiting decision...");
      await sleep(1000);
    }
  };

  const endPlay = () => (gameOver.value = true);

  const autoPlay = async () => {
    console.info("Running autoplay...");
    deal();
    await playRound();
    console.info("Autoplay complete.");
  };

  const opponentPlay = async () => {
    // Wait if player is still handling decision modal
    await decision();
    // End play if player calls STOP
    if (gameOver.value) return;
    if (gs.activePlayer.id === "p2") {
      setPlaySpeed(2);
      await playSteps(STEPS);
      await decision();  // TODO: Automate opponent koikoi decision
      swap();
    } else {
      console.warn("Function 'opponentPlay' called while Player 1 is active.");
    }
  };

  return { autoPlay, opponentPlay };
};
