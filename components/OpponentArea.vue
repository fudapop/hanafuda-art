<template>
  <div class="relative [--card-height:45px] -translate-y-4 w-max mx-auto">
    <!-- OPPONENT HAND -->
    <ListGrid :cols="8" :rows="'auto'" flow="row" gap="2px">
      <!-- FACE-DOWN CARDS -->
      <div
        v-for="card in hand.p2"
        :class="{
          'relative card down bg-slate-800': true,
          'opacity-0 transition-opacity': card === selectedCard || staged.has(card),
        }"
      ></div>

      <!-- OPPONENT-SELECTED CARD -->
      <div
        :class="{
          'transition-transform absolute top-1/2 inset-x-0 mx-auto': true,
          'scale-[1.5] translate-y-1': selectedCard,
        }"
      >
        <Transition
          appear
          mode="out-in"
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 motion-safe:-scale-x-50"
          enter-to-class="opacity-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 motion-safe:translate-y-2"
        >
          <CardImage
            class="card"
            v-if="selectedCard && players.p2.isActive && checkCurrentPhase('select')"
            :src="getCardUrl(selectedCard)!"
            :card="selectedCard"
          />
        </Transition>
      </div>
    </ListGrid>
  </div>
</template>

<script setup lang="ts">
import { useGameDataStore } from "~/stores/gameDataStore";
import { useCardStore } from "~/stores/cardStore";
import { usePlayerStore } from "~/stores/playerStore";

const { hand, staged } = useCardStore();
const { players } = usePlayerStore();
const { checkCurrentPhase } = useGameDataStore();
const { getCardUrl } = useCardDesign();
const selectedCard = useCardHandler().useSelectedCard();
</script>

<style scoped></style>
