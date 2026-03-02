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
          @click="handlePressExit"
          :class="[
            'game-ui-btn',
            gameStart && 'opacity-50 hover:opacity-100',
            localPlayerInactive && 'cursor-wait',
          ]"
          :disabled="localPlayerInactive"
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
          <!-- PROFILE TAB -->
          <template #tab-panel-4>
            <ProfilePanel />
          </template>
          <template #tab-icon-4>
            <Icon
              name="ic:round-account-circle"
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
        'opacity-40': players[selfKey].isActive,
        '-translate-y-full': !gameStart,
      }"
    >
      <OpponentStatusBar />
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
        'opacity-40': players[opponentKey].isActive,
        'translate-y-full': !gameStart,
      }"
    >
      <PlayerStatusBar :user="user" />
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
    <!-- Single player exit modal -->
    <LazyExitWarning
      v-if="!isMultiplayerGame"
      :open="leavingGame"
      :isSaving="isSaving"
      @cancel="leavingGame = false"
      @save="handleSaveAndExit"
      @forfeit="handleForfeitAndExit"
    />
    <!-- Multiplayer exit modal -->
    <LazyMultiplayerExitModal
      v-if="isMultiplayerGame"
      :open="leavingGame"
      :isSaving="isSaving"
      @cancel="leavingGame = false"
      @leave="handleMultiplayerLeave"
    />
    <!-- <FeedbackForm
      :open="promptFeedback"
      @close="
        () => {
          promptFeedback = false
        }
      "
    /> -->
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
import { usePlayerStore } from '~~/stores/playerStore'

const { currentDesign } = useCardDesign()
const { t } = useI18n()
const { $clientPosthog } = useNuxtApp()

const { players } = storeToRefs(usePlayerStore())
const { selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()
const { current: user } = useProfile()

const gameStart = useState('start', () => false)
const leavingGame = ref(false)
const isSaving = ref(false)
// const promptFeedback = ref(false)
const promptSignup = ref(false)
const showLoader = ref(false)
const localPlayerInactive = computed(() => {
  if (isMultiplayerGame.value) return false
  return gameStart.value && !players.value.p1.isActive
})

const feedbackSubmitted = computed(() => user.value?.flags?.hasSubmittedFeedback)
const signupDeclined = useStorage('hanafuda-signup-declined', false, sessionStorage)

const handlePressExit = async () => {
  $clientPosthog?.capture('exit_game')
  leavingGame.value = true
}

const handleSaveAndExit = async () => {
  $clientPosthog?.capture('exit_game_save')
  isSaving.value = true

  try {
    const { quickSave } = useStoreManager()
    await quickSave() // Save current game state

    leavingGame.value = false
    gameStart.value = false
  } catch (error) {
    console.error('Failed to save game:', error)
    // Still exit even if save fails, but could show error message
    leavingGame.value = false
    gameStart.value = false
  } finally {
    isSaving.value = false
  }
}

const handleForfeitAndExit = () => {
  $clientPosthog?.capture('exit_game_forfeit')
  leavingGame.value = false
  // Reset gameStart to trigger cleanup in main game component
  gameStart.value = false
}

const handleMultiplayerLeave = async (message: string | null) => {
  $clientPosthog?.capture('exit_multiplayer_game')
  isSaving.value = true

  try {
    const { saveMultiplayerGame } = useStoreManager()
    const { current: currentProfile } = useProfile()
    const { setMessage, cleanup: cleanupPresence } = usePresence()
    const ps = usePlayerStore()

    if (!currentProfile.value) {
      throw new Error('User not authenticated')
    }

    // Get multiplayer meta state for p1 and p2 uids
    const multiplayerMeta = useState<{
      isNew: boolean
      gameId: string
      p1: string
      p2: string
      activePlayerUid: string
    }>('multiplayer-game-meta', () => ({
      isNew: false,
      gameId: '',
      p1: '',
      p2: '',
      activePlayerUid: '',
    }))

    const p1 = multiplayerMeta.value.p1 || currentProfile.value.uid
    const p2 = multiplayerMeta.value.p2 || ''
    const activeKey = ps.activePlayer.id as 'p1' | 'p2'
    const activePlayer = activeKey === 'p1' ? p1 : p2

    // Save game state to Firestore
    await saveMultiplayerGame(p1, p2, activePlayer)

    // Set presence message if provided
    if (message) {
      await setMessage(message)
    }

    // Cleanup presence tracking
    await cleanupPresence()

    leavingGame.value = false
    gameStart.value = false
  } catch (error) {
    console.error('Failed to save multiplayer game:', error)
    // Still exit even if save fails
    leavingGame.value = false
    gameStart.value = false
  } finally {
    isSaving.value = false
  }
}

const handleSignupCancel = async () => {
  $clientPosthog?.capture('signup_declined')
  showLoader.value = true
  promptSignup.value = false
  signupDeclined.value = true
  await sleep()
  showLoader.value = false
  // promptFeedback.value = true
}

const unwatchGame = watch([gameStart, leavingGame], async () => {
  if (!gameStart.value && !leavingGame.value) {
    showLoader.value = true
    if (user.value?.isGuest && !signupDeclined.value) {
      await sleep()
      showLoader.value = false
      promptSignup.value = true
      return
    }
    if (!feedbackSubmitted.value) {
      await sleep()
      showLoader.value = false
      // promptFeedback.value = true
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
