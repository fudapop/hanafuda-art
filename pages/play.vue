<template>
  <GameLayout>
    <div class="z-10 grid grid-rows-[--table-grid-rows] w-full min-w-[320px] max-w-[1200px] h-full min-h-[500px] mx-auto">
      <!-- OPPONENT HAND -->
      <div class="[--card-height:45px] -translate-y-4">
        <ListGrid :cols="8" :rows="'auto'" flow="row" gap="2px">
          <div v-for="card in cs.hand.p2" class="relative card bg-slate-800">
            <CardTransition>
              <img v-if="selected().value === card" :src="useDesignPath(card)" :alt="card"
                class="absolute object-contain mx-auto scale-[2] z-20" />
            </CardTransition>
          </div>
        </ListGrid>
      </div>

      <!-- OPPONENT COLLECTION -->
      <div class="-translate-y-8 pointer-events-none -z-10">
        <CollectionArea player="p2" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- FIELD -->
      <div class="max-md:[--card-height:80px] place-content-center grid grid-cols-[80px_1fr]">
        <Deck />
        <ClickDisabled :enable-condition="!!useState('selected').value">
          <ListGrid :cols="6" :rows="2" flow="column" gap="4px">
            <CardList :cards="cs.field" />
          </ListGrid>
        </ClickDisabled>
      </div>

      <!-- PLAYER COLLECTION -->
      <div class="pointer-events-none -z-10">
        <CollectionArea player="p1" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- PLAYER HAND -->
      <div class="max-md:[--card-height:90px] grid place-content-center translate-y-8">
        <ClickDisabled :enable-condition="activePlayer.id === 'p1' && gs.checkCurrentPhase('select')">
          <ListGrid :cols="8" :rows="'auto'" flow="row" gap="4px">
            <CardList :cards="cs.hand.p1" />
          </ListGrid>
        </ClickDisabled>
      </div>
    </div>

    <ClientOnly>
      <YakuDialog @stop="handleStop" @koikoi="handleKoiKoi" />
    </ClientOnly>

    <!-- DEV BUTTONS -->
    <div v-if="cs.deck.size === 48 || gameOver"
      class="absolute inset-y-0 z-10 flex flex-col gap-1 my-auto right-4 w-max h-max">
      <button v-if="cs.deck.size === 48" type="button"
        class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="startRound">
        Deal Cards
      </button>
      <button v-else type="button"
        class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="nextRound">
        Next Round
      </button>
      <button v-show="cs.deck.size === 48" type="button"
        class="rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        @click="startAuto">
        Autoplay
      </button>
    </div>
  </GameLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGlobalStore } from "~/stores/globalStore";
import { useCardStore } from "~/stores/cardStore";
import { CompletionEvent } from "~/components/CollectionArea.vue";

const cs = useCardStore();
const gs = useGlobalStore();
const { activePlayer } = storeToRefs(gs);
const { useSelectedCard: selected } = useCardHandler();

const { useDesignPath, useDesign } = useCardDesign();
useDesign().value = "cherry-version";

const { autoPlay, opponentPlay, useOpponent } = useAutoplay();
const autoOpponent: Ref<boolean> = useOpponent();
const gameOver: Ref<boolean> = useState("gameover", () => false);
const callDecision: Ref<boolean> = useState("decision", () => false);

const handleCompletion = (data: CompletionEvent) => {
  const { player, score, completed } = data;
  gs.updateScore(player, score);
  const message = `${player.toUpperCase()} *** Completed ${completed
    .map((s) => s.toUpperCase())
    .join(" + ")}!`;
  consoleLogColor(message, "skyblue");
  consoleLogColor("\tScore: " + score, "lightblue");
  gs.recordRound(data);
  callDecision.value = true;
};

const handleStop = () => {
  gameOver.value = true;
  callDecision.value = false;
  const result = gs.lastRoundResult;
  gs.endRound();
  console.log("END ROUND:", Object.entries(result as Object).map(arr => arr.join(': ')));
};

const handleKoiKoi = () => {
  gs.incrementBonus();
  callDecision.value = false;
};

const startAuto = () => {
  autoOpponent.value = false;
  gameOver.value = false;
  autoPlay({});
};

const startRound = () => {
  gameOver.value = false;
  autoOpponent.value = true;
  cs.dealCards();
  if (gs.players.p2.isActive) opponentPlay({ speed: 2 });
};

const nextRound = () => {
  cs.reset();
  gs.nextRound();
};

watchEffect(() => {
  if (autoOpponent.value && gs.players.p2.isActive) opponentPlay({ speed: 2 });
});
</script>
