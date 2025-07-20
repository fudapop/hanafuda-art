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
          class-name="grid grid-cols-3 gap-2 py-2"
        >
          <template #group-label>
            <span class="capitalize">{{ $t('common.labels.rounds') }}</span>
          </template>
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
              {{ $t('settings.gameplay.moonFlowerViewing') }}
            </a>
            <a
              href="https://fudawiki.org/en/hanafuda/games/koi-koi#taming-the-sake-cup"
              title="Read about this rule on fudawiki.org"
              target="_blank"
            >
              <QuestionMarkCircleIcon
                class="inline w-5 h-5 mb-1 cursor-pointer text-text-secondary hover:text-primary"
              />
              <span class="sr-only">{{ $t('settings.gameplay.readAboutThisRule') }}</span>
            </a>
          </template>
        </OptionsRadioGroup>

        <div class="space-y-4">
          <div class="flex">
            <p class="text-base font-semibold leading-6 text-text">
              {{ $t('settings.gameplay.otherVariations') }}
            </p>
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
              <template #label>{{ $t('settings.gameplay.wildCardSakeCup') }}</template>
              <template #description>{{
                $t('settings.gameplay.wildCardSakeCupDescription')
              }}</template>
            </ToggleSwitch>

            <!-- Set additional scoring rule -->
            <ToggleSwitch
              :callback="toggleDouble"
              :init-value="config.doubleScoreOverSeven"
            >
              <template #label>{{ $t('settings.gameplay.doubleOverSeven') }}</template>
              <template #description>{{
                $t('settings.gameplay.doubleOverSevenDescription')
              }}</template>
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
          {{ $t('settings.notices.settingsLocked') }}
        </p>
        <ul class="grid w-full mx-auto gap-y-4">
          <li class="flex justify-between leading-6 text-text">
            <span class="font-semibold"> {{ $t('settings.gameplay.gameLength') }} </span>
            <span class="capitalize text-primary">
              {{ config.maxRounds }} {{ $t('common.labels.rounds') }}
            </span>
          </li>
          <li class="flex justify-between leading-6 text-text">
            <div>
              <span class="font-semibold"> {{ $t('settings.gameplay.moonFlowerViewing') }} </span>
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
              <span class="font-semibold"> {{ $t('settings.gameplay.wildCardSakeCup') }} </span>
              <span class="block w-3/4 pl-2 text-sm text-text-secondary">
                {{ $t('settings.gameplay.wildCardSakeCupDescription') }}
              </span>
            </div>
            <span class="self-center capitalize text-primary">
              {{
                config.sakeIsWildCard ? $t('common.states.enabled') : $t('common.states.disabled')
              }}
            </span>
          </li>
          <li class="flex justify-between leading-6 text-text">
            <div>
              <span class="font-semibold"> {{ $t('settings.gameplay.doubleOverSeven') }} </span>
              <span class="block w-3/4 pl-2 text-sm text-text-secondary">
                {{ $t('settings.gameplay.doubleOverSevenDescription') }}
              </span>
            </div>
            <span class="self-center capitalize text-primary">
              {{
                config.doubleScoreOverSeven
                  ? $t('common.states.enabled')
                  : $t('common.states.disabled')
              }}
            </span>
          </li>
        </ul>
      </div>

      <div :class="['space-y-4 pb-4 pt-8']">
        <p class="text-base font-semibold leading-6 text-text">
          {{ $t('settings.interface.title') }}
        </p>
        <ToggleSwitch
          :callback="toggleLabels"
          :init-value="config.cardLabels"
        >
          <template #label>{{ $t('settings.interface.cardLabels') }}</template>
          <template #description>{{ $t('settings.interface.cardLabelsDescription') }}</template>
        </ToggleSwitch>

        <OptionsRadioGroup
          :model-value="config.cardSizeMultiplier"
          :update-callback="(option) => (config.cardSizeMultiplier = option as CardSizeOptions)"
          :value-options="config.OPTIONS.CARD_SIZE"
          :label-template="(option) => getCardSizeLabel(option as CardSizeOptions)"
          class-name="grid grid-cols-3 gap-2 py-2"
        >
          <template #group-label>{{ $t('settings.interface.cardSize') }}</template>
          <template #group-description>{{ $t('settings.interface.cardSizeDescription') }}</template>
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

const { t } = useI18n()
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

const getCardSizeLabel = (size: CardSizeOptions) => {
  switch (size) {
    case 0.8:
      return t('settings.interface.sizes.small')
    case 1.0:
      return t('settings.interface.sizes.normal')
    case 1.2:
      return t('settings.interface.sizes.large')
    default:
      return t('settings.interface.sizes.normal')
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
  if (!config.settingsLoaded && user?.settings) {
    config.loadUserSettings(user.settings as GameSettings)
  }
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
