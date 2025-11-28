<template>
  <div
    class="sm:[@media_(max-height:500px)]:[--card-height:80px] sm:[@media_(max-height:500px)]:grid-rows-[50px_1fr_50px] h-dvh overflow-hidden relative"
  >
    <!-- BACKGROUND ELEMENTS -->
    <div
      v-if="gameStart"
      class="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10"
    >
      <GameBackground />
    </div>

    <!-- Allows interaction when game not started -->
    <Teleport to="body">
      <!-- EXIT BUTTON -->
      <div
        v-if="gameStart"
        class="fixed w-max top-16 right-4"
      >
        <button
          id="exit-button"
          type="button"
          @click="handleExit"
          :class="[
            'game-ui-btn',
            gameStart && 'opacity-50 hover:opacity-100',
            player1Inactive && 'cursor-wait',
          ]"
          :disabled="player1Inactive"
        >
          <Icon
            name="mdi:logout"
            class="w-5 h-5 text-white transition-transform duration-300"
            aria-hidden="true"
          />
          <span class="sr-only">{{ t('navigation.backToTitleScreen') }}</span>
        </button>
      </div>

      <!-- OPTIONS MENU -->
      <div class="fixed flex bottom-4 right-4 gap-x-4">
        <GameOptionsPanel :tabs="demoTabs">
          <!-- DECK TAB -->
          <template #tab-panel-1>
            <DesignRadioGroup />
          </template>
          <template #tab-icon-1>
            <Icon
              name="mdi:cards"
              class="text-base"
              aria-hidden="true"
            />
          </template>
          <!-- COLLECTION TAB -->
          <template #tab-panel-2>
            <CollectionProgress />
          </template>
          <template #tab-icon-2>
            <Icon
              name="mdi:cards-outline"
              class="text-base"
              aria-hidden="true"
            />
          </template>
          <!-- GAMEPLAY TAB -->
          <template #tab-panel-3>
            <GameplaySettings />
          </template>
          <template #tab-icon-3>
            <Icon
              name="mdi:gamepad-variant"
              class="text-base"
              aria-hidden="true"
            />
          </template>
        </GameOptionsPanel>
      </div>
    </Teleport>

    <!-- OPPONENT STATUS BAR -->
    <div
      :class="{
        'z-[-1] fixed top-0 inset-x-0 duration-300 transition-all sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-br-full': true,
        'opacity-40': players.p1.isActive,
        '-translate-y-full': !gameStart,
      }"
    >
      <StatusBar
        :user="null"
        :playerNum="2"
      />
    </div>

    <!-- GAMEPLAY AREA -->
    <Transition
      mode="out-in"
      appear
      leave-active-class="duration-300 ease-in"
      leave-to-class="opacity-0"
      leave-from-class="opacity-100"
      enter-active-class="duration-300 ease-out"
      enter-to-class="opacity-100"
      enter-from-class="opacity-0"
    >
      <PlayArea
        v-if="gameStart"
        :class="currentDesign"
      >
        <slot />
      </PlayArea>
      <div
        v-else
        class="relative h-full isolate"
      >
        <StartScreen @start-game="gameStart = true" />
      </div>
    </Transition>

    <!-- PLAYER STATUS BAR -->
    <div
      :class="{
        'z-[-1] fixed bottom-0 inset-x-0 duration-300 transition-all bg-transparent sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-tr-full': true,
        'opacity-40': players.p2.isActive,
        'translate-y-full': !gameStart,
      }"
    >
      <StatusBar
        :user="user"
        :playerNum="1"
      />
    </div>

    <!-- EXIT CONFIRMATION MODAL -->
    <LazyExitWarning
      :open="showExitConfirm"
      @forfeit="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { GameOptionsTab } from '~/composables/useOptionsPanel'
import { usePlayerStore } from '~~/stores/playerStore'

const { currentDesign } = useCardDesign()
const { t } = useI18n()

const { players } = storeToRefs(usePlayerStore())
const { current: user } = useProfile()

const gameStart = useState('start', () => false)
const showExitConfirm = ref(false)
const player1Inactive = computed(() => gameStart.value && !players.value.p1.isActive)

const demoTabs: GameOptionsTab[] = ['deck', 'yaku', 'settings']

const handleExit = () => {
  showExitConfirm.value = true
}

const confirmExit = () => {
  showExitConfirm.value = false
  gameStart.value = false
}
</script>
