<template>
  <div
    class="sm:[@media_(max-height:500px)]:[--card-height:80px] sm:[@media_(max-height:500px)]:grid-rows-[50px_1fr_50px] h-[100dvh] overflow-hidden relative"
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
      <div class="fixed w-max top-16 right-4">
        <button
          id="exit-button"
          type="button"
          @click="handlePressExit"
          :class="['game-ui-btn', gameStart && 'opacity-50 hover:opacity-100']"
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
        <GameOptionsPanel :tabs="Array.from(GAME_OPTIONS_TABS)">
          <template #tab-panel-1>
            <DesignRadioGroup />
          </template>
          <!-- DESIGN TAB -->
          <template #tab-icon-1>
            <Icon
              name="mdi:cards-variant"
              class="w-5 h-5"
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
              class="w-5 h-5"
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
              class="w-5 h-5"
              aria-hidden="true"
            />
          </template>
          <!-- PROFILE TAB -->
          <template #tab-panel-4>
            <LazyProfilePanel />
          </template>
          <template #tab-icon-4>
            <Icon
              name="heroicons:user"
              class="w-5 h-5"
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
      <LazyStatusBar
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
        <NewStartScreen @start-game="gameStart = true" />
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
      <LazyStatusBar
        :user="user"
        :playerNum="1"
      />
    </div>

    <!-- LOADER -->
    <Transition
      appear
      enter-active-class="duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="showLoader"
        class="absolute inset-0 h-full pointer-events-none top-1/3 isolate"
      >
        <SakuraLoader class="mx-auto opacity-80 w-max" />
        <p class="font-semibold tracking-wide text-center text-white drop-shadow-md animate-pulse">
          {{ t('common.labels.justAMoment') }}
        </p>
      </div>
    </Transition>

    <!-- MODALS -->
    <LazyExitWarning
      :open="leavingGame"
      @cancel="leavingGame = false"
      @confirm="handleConfirmExit"
    />
    <LazyFeedbackForm
      :open="promptFeedback"
      @close="
        () => {
          promptFeedback = false
        }
      "
    />
    <LazySignupPrompt
      :open="promptSignup"
      @cancel="handleSignupCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { GAME_OPTIONS_TABS } from '~/composables/useOptionsPanel'
import { usePlayerStore } from '~/stores/playerStore'

const { currentDesign } = useCardDesign()
const { logout } = useAuth()
const { t } = useI18n()

const { players } = storeToRefs(usePlayerStore())
const user = toValue(useProfile().current)

const gameStart = useState('start', () => false)
const leavingGame = ref(false)
const promptFeedback = ref(false)
const promptSignup = ref(false)
const showLoader = ref(false)

const feedbackSubmitted = computed(() => user?.flags?.hasSubmittedFeedback)
const signupDeclined = useStorage('hanafuda-signup-declined', false, sessionStorage)

const handlePressExit = () => {
  if (!gameStart.value) {
    logout()
    navigateTo({ path: '/sign-in', query: { exit: 'true' } })
  } else {
    leavingGame.value = true
  }
}

const handleConfirmExit = () => {
  leavingGame.value = false
  gameStart.value = false
}

const handleSignupCancel = async () => {
  showLoader.value = true
  promptSignup.value = false
  signupDeclined.value = true
  await sleep()
  showLoader.value = false
  promptFeedback.value = true
}

const unwatchGame = watch([gameStart, leavingGame], async () => {
  if (!gameStart.value && !leavingGame.value) {
    showLoader.value = true
    if (user?.isGuest && !signupDeclined.value) {
      await sleep()
      showLoader.value = false
      promptSignup.value = true
      return
    }
    if (!feedbackSubmitted.value) {
      await sleep()
      showLoader.value = false
      promptFeedback.value = true
      return
    }
    await sleep(500)
    showLoader.value = false
    unwatchGame()
  }
})

onUnmounted(() => {
  unwatchGame?.()
})
</script>
