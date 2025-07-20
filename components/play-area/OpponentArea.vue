<template>
  <div class="relative w-full h-full isolate">
    <div :class="['absolute bottom-0 inset-x-0', cardAreaClasses]">
      <div class="relative mx-auto w-max">
        <!-- OPPONENT HAND -->
        <ListGrid
          :cols="8"
          :rows="'auto'"
          flow="row"
          gap="2px"
        >
          <!-- FACE-DOWN CARDS -->
          <div
            v-for="card in hand.p2"
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
                v-if="selectedCard && players.p2.isActive && checkCurrentPhase('select')"
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
import { useBreakpoints, useScreenOrientation } from '@vueuse/core'
import { useCardStore } from '~/stores/cardStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore } from '~/stores/playerStore'

// Breakpoint and orientation detection for responsive opponent area
const breakpoints = useBreakpoints({
  sm: 640,
  lg: 1024,
})

const { orientation } = useScreenOrientation()
const isLandscape = computed(() => orientation.value?.includes('landscape'))
const isMobile = breakpoints.smaller('sm')

// Responsive card area classes
const cardAreaClasses = computed(() => ({
  '[--card-height:60px] lg:[--card-height:75px]': !isMobile.value || !isLandscape.value, // Standard sizes
  '[--card-height:45px]': isMobile.value && isLandscape.value, // Compact size for landscape mobile
}))

const { hand, staged } = useCardStore()
const { players } = usePlayerStore()
const { checkCurrentPhase } = useGameDataStore()
const { getCardUrl } = useCardDesign()
const selectedCard = useCardHandler().useSelectedCard()
const { t } = useI18n()
</script>

<style scoped></style>
