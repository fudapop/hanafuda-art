<template>
  <div
    ref="settingsPanel"
    class="h-full px-8 py-8"
  >
    <ClientOnly>
      <div
        v-show="!gameStart"
        class="space-y-8"
      >
        <!-- Set maximum for number of rounds per game -->
        <OptionsRadioGroup
          :model-value="config.maxRounds"
          :update-callback="(option) => (config.maxRounds = option as GameLengthOptions)"
          :value-options="config.OPTIONS.GAME_LENGTH"
          :label-template="(option) => `${option} rounds`"
        >
          <template #group-label> Game Length </template>
        </OptionsRadioGroup>

        <!-- Set allowance of TSUKIMI-/HANAMI-ZAKE -->
        <OptionsRadioGroup
          :model-value="config.allowViewingsYaku"
          :update-callback="(option) => (config.allowViewingsYaku = option as ViewingsOptions)"
          :value-options="config.OPTIONS.VIEWINGS"
          :description-template="(option) => getOptionDescription(option as ViewingsOptions)"
        >
          <template #group-label>
            <a
              title="Tsukimi-/Hanami-zake"
              class="underline decoration-dotted underline-offset-4 cursor-help"
            >
              Moon/Flower Viewing
            </a>
            <a
              href="https://fudawiki.org/en/hanafuda/games/koi-koi#taming-the-sake-cup"
              title="Read about this rule on fudawiki.org"
              target="_blank"
            >
              <QuestionMarkCircleIcon
                class="inline w-5 h-5 mb-1 cursor-pointer text-text-secondary hover:text-primary"
              />
              <span class="sr-only">Read about this rule on fudawiki.org</span>
            </a>
          </template>
        </OptionsRadioGroup>

        <div class="space-y-4">
          <div class="flex">
            <p class="text-base font-semibold leading-6 text-text">Other Variations</p>
            <a
              href="https://fudawiki.org/en/hanafuda/games/koi-koi#scoring-variations"
              title="Read about scoring on fudawiki.org"
              target="_blank"
            >
              <QuestionMarkCircleIcon
                class="inline w-5 h-5 mb-1 ml-1 cursor-pointer text-text-secondary hover:text-primary"
              />
              <span class="sr-only">Read about scoring on fudawiki.org</span>
            </a>
          </div>
          <div class="space-y-4">
            <!-- Set wild-card behavior for KIKU-NI-SAKAZUKI -->
            <ToggleSwitch
              :callback="toggleSake"
              :init-value="config.sakeIsWildCard"
            >
              <template #label>Wild Card Sake Cup</template>
              <template #description
                >The
                <a
                  title="Kiku ni sakazuki"
                  class="underline cursor-help underline-offset-4 decoration-dotted"
                  >sake cup</a
                >
                counts as both animal and plain types.</template
              >
            </ToggleSwitch>

            <!-- Set additional scoring rule -->
            <ToggleSwitch
              :callback="toggleDouble"
              :init-value="config.doubleScoreOverSeven"
            >
              <template #label>Double Over Seven</template>
              <template #description
                >Double the score if the combined yaku value is 7 points or greater.</template
              >
            </ToggleSwitch>
          </div>
        </div>
      </div>

      <!-- Hide options and show current settings while game is in progress -->
      <div
        v-show="gameStart"
        class="w-full"
      >
        <p class="my-4 text-text-secondary">
          <LockClosedIcon class="inline w-6 h-6 align-text-bottom" />
          Some settings are locked while a game is in progress.
        </p>
        <ul class="grid w-full mx-auto gap-y-4">
          <li class="flex justify-between leading-6 text-text">
            <span class="font-semibold"> Game Length </span>
            <span class="capitalize text-primary"> {{ config.maxRounds }} rounds </span>
          </li>
          <li class="flex justify-between leading-6 text-text">
            <div>
              <span class="font-semibold"> Moon/Flower Viewings </span>
              <span class="block w-3/4 pl-2 text-sm text-text-secondary">
                {{ getOptionDescription(config.allowViewingsYaku) }}
              </span>
            </div>
            <span class="self-center capitalize text-primary">
              {{ config.allowViewingsYaku }}
            </span>
          </li>
          <li class="flex justify-between leading-6 text-text">
            <div>
              <span class="font-semibold"> Wild Card Sake Cup </span>
              <span class="block w-3/4 pl-2 text-sm text-text-secondary">
                The sake cup counts as both animal and plain types.
              </span>
            </div>
            <span class="self-center capitalize text-primary">
              {{ config.sakeIsWildCard ? 'Enabled' : 'Disabled' }}
            </span>
          </li>
          <li class="flex justify-between leading-6 text-text">
            <div>
              <span class="font-semibold"> Double Over Seven </span>
              <span class="block w-3/4 pl-2 text-sm text-text-secondary">
                Double the score if the combined yaku value is 7 points or greater.
              </span>
            </div>
            <span class="self-center capitalize text-primary">
              {{ config.doubleScoreOverSeven ? 'Enabled' : 'Disabled' }}
            </span>
          </li>
        </ul>
      </div>

      <div :class="['space-y-4 pb-4 pt-8']">
        <p class="text-base font-semibold leading-6 text-text">Interface</p>
        <ToggleSwitch
          :callback="toggleLabels"
          :init-value="config.cardLabels"
        >
          <template #label>Card Labels</template>
          <template #description>Include card corner labels to assist with matching.</template>
        </ToggleSwitch>

        <ToggleSwitch
          :callback="toggleFullscreen"
          :init-value="config.allowFullscreen"
        >
          <template #label>Allow Fullscreen</template>
          <template #description
            >Enable to hide/show toggle button to enter/exit fullscreen mode.</template
          >
        </ToggleSwitch>

        <OptionsRadioGroup
          :model-value="config.cardSizeMultiplier"
          :update-callback="(option) => (config.cardSizeMultiplier = option as CardSizeOptions)"
          :value-options="config.OPTIONS.CARD_SIZE"
          :label-template="(option) => getCardSizeLabel(option as CardSizeOptions)"
        >
          <template #group-label>Card Size</template>
          <template #group-description>Select the size that best suits your screen.</template>
        </OptionsRadioGroup>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { LockClosedIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
import {
  useConfigStore,
  type CardSizeOptions,
  type GameLengthOptions,
  type GameSettings,
  type ViewingsOptions,
} from '~/stores/configStore'

const config = useConfigStore()
const settingsPanel: Ref<HTMLElement | null> = ref(null)
const settingsUpdated = ref(false)
const gameStart: Ref<boolean> = useState('start')

const toggleSake = (enabled: boolean) => {
  config.sakeIsWildCard = enabled
}

const toggleDouble = (enabled: boolean) => {
  config.doubleScoreOverSeven = enabled
}

const toggleLabels = (enabled: boolean) => {
  config.cardLabels = enabled
}

const toggleFullscreen = (enabled: boolean) => {
  config.allowFullscreen = enabled
}

const updateCardSize = (size: CardSizeOptions) => {
  config.cardSizeMultiplier = size
}

const getCardSizeLabel = (size: CardSizeOptions) => {
  // TODO: Create an enum
  switch (size) {
    case 0.8:
      return 'Small'
    case 1.0:
      return 'Normal'
    case 1.2:
      return 'Large'
    default:
      return 'Normal'
  }
}

const getOptionDescription = (option: ViewingsOptions) => {
  switch (option) {
    case 'allow':
      return 'Completion is scored normally.'
    case 'limited':
      return 'Requires another completed yaku to score points.'
    case 'none':
      return 'No points are scored for completion.'
  }
}

const user = toValue(useProfile().current)

/**
 * Load game settings from local storage or
 * from user profile in database
 */
const loadSettings = async () => {
  // const userSettings = getLocalData() ?? (await getProfileData())?.settings
  if (user && user.settings) {
    config.loadUserSettings(user.settings as GameSettings)
  }
}

// const getLocalData = () => {
//   const localSettings = localStorage.getItem("hanafuda-settings");
//   if (!localSettings) return;
//   console.info("Settings loaded from local storage.");
//   return JSON.parse(localSettings);
// };

/**
 * Save selection in local storage and database if settings were changed
 */
const saveSettings = () => {
  if (!settingsUpdated.value || !user) return
  if (!user.settings) {
    console.info('Creating settings...')
  } else {
    console.info('Updating settings...')
  }
  user.settings = config.getCurrentSettings
  console.info('Profile updated.')
  settingsUpdated.value = false
}

onMounted(async () => {
  // Database reads/writes minimized by using local storage.
  await loadSettings()
  watch(config, () => {
    settingsUpdated.value = true
    // Register listener to save settings when the panel is closed.
    const cleanup = onClickOutside(settingsPanel, () => {
      saveSettings()
      cleanup?.()
    })
  })
})
</script>
