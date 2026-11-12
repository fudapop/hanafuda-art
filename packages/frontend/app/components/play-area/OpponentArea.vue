<template>
  <div class="relative w-full isolate">
    <div class="board-opponent fit-cards">
      <div class="relative mx-auto w-max max-w-full">
        <!-- OPPONENT HAND -->
        <ListGrid
          :cols="8"
          :rows="'auto'"
          flow="row"
          gap="2px"
        >
          <!-- FACE-DOWN CARDS -->
          <div
            v-for="card in hand[opponentKey]"
            :class="{
              'card down bg-slate-800': true,
              'opacity-0 transition-opacity': card === selectedCard || staged.has(card),
            }"
          ></div>

          <!-- OPPONENT-SELECTED CARD -->
          <div
            :class="{
              'transition-transform duration-200 absolute bottom-0 left-1/2 -translate-x-1/2 w-max mx-auto': true,
              'scale-[2] translate-y-8 z-10': selectedCard,
            }"
          >
            <Transition
              appear
              mode="out-in"
              enter-active-class="duration-300 ease-out"
              enter-from-class="opacity-0 motion-safe:-scale-x-50"
              enter-to-class="opacity-100"
              leave-active-class="duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if="selectedCard && players[opponentKey].isActive && checkCurrentPhase('select')"
                class="relative z-50 overflow-hidden card"
              >
                <!-- Accessibility announcement for opponent's selected card -->
                <div
                  aria-live="polite"
                  class="sr-only"
                >
                  {{ t('collection.opponentCollection') + ': ' + selectedCard }}
                </div>
                <CardImage
                  class="drop-shadow-md"
                  :src="getCardUrl(selectedCard)!"
                  :card="selectedCard"
                />
              </div>
            </Transition>
          </div>
        </ListGrid>
      </div>

      <!-- ARTIST CREDIT -->
      <div class="w-full text-center">
        <ArtistCredit />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardStore } from '~~/stores/cardStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'

const { opponentKey } = useLocalPlayerPerspective()

const { hand, staged } = useCardStore()
const { players } = usePlayerStore()
const { checkCurrentPhase } = useGameDataStore()
const { getCardUrl } = useCardDesign()
const selectedCard = useCardHandler().useSelectedCard()
const { t } = useI18n()
</script>

<style scoped></style>
