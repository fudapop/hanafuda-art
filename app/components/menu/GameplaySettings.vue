<template>
  <div
    ref="settingsPanel"
    class="h-full px-8 py-8"
  >
    <!-- Game rules: editable before game, locked during game -->
    <div v-show="!gameStart">
      <MatchRulesPanel
        :rules="currentRules"
        :editable="true"
        @update:rules="applyRules"
      />
    </div>

    <!-- Hide options and show current settings while game is in progress -->
    <div
      v-show="gameStart"
      class="w-full"
    >
      <p class="my-4 text-text-secondary">
        <LockClosedIcon class="inline w-6 h-6 align-text-bottom" />
        {{ t('settings.notices.settingsLocked') }}
      </p>
      <MatchRulesPanel
        :rules="currentRules"
        :editable="false"
      />
    </div>

    <div :class="['space-y-4 pb-20 pt-8']">
      <p class="text-base font-semibold leading-6 text-text">
        {{ t('settings.interface.title') }}
      </p>
      <ToggleSwitch
        :callback="toggleLabels"
        :init-value="config.cardLabels"
      >
        <template #label>{{ t('settings.interface.cardLabels') }}</template>
        <template #description>{{ t('settings.interface.cardLabelsDescription') }}</template>
      </ToggleSwitch>

      <OptionsRadioGroup
        :model-value="config.cardSizeMultiplier"
        :update-callback="(option) => (config.cardSizeMultiplier = option as CardSizeOptions)"
        :value-options="config.OPTIONS.CARD_SIZE"
        :label-template="(option) => getCardSizeLabel(option as CardSizeOptions)"
        class-name="grid grid-cols-3 gap-2 py-2"
      >
        <template #group-label>{{ t('settings.interface.cardSize') }}</template>
        <template #group-description>{{ t('settings.interface.cardSizeDescription') }}</template>
      </OptionsRadioGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
import {
  useConfigStore,
  type CardSizeOptions,
  type GameRules,
} from '~~/stores/configStore'

const { t } = useI18n()
const config = useConfigStore()
const settingsPanel: Ref<HTMLElement | null> = ref(null)
const settingsUpdated = ref(false)
const gameStart: Ref<boolean> = useState('start')

const currentRules = computed<GameRules>(() => config.getGameRules)

function applyRules(rules: GameRules) {
  config.applyGameRules(rules)
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

const { current: user, updateProfile } = useProfile()

const saveSettings = async () => {
  if (!settingsUpdated.value || !user.value) return

  // Use updateProfile to properly persist settings changes
  await updateProfile({
    settings: { ...config.getCurrentSettings },
  })
  settingsUpdated.value = false
}

onMounted(async () => {
  // Settings are now loaded when the profile is loaded in usePlayerProfile
  // This check is kept for backwards compatibility in case settings weren't loaded yet
  if (!config.settingsLoaded && user.value?.settings) {
    config.loadUserSettings(user.value.settings)
  }

  // Ensure settings are loaded into config once the profile becomes available,
  // even if the options panel is opened before a game starts.
  watch(
    user,
    (newUser) => {
      if (!newUser?.settings) return
      if (config.settingsLoaded) return
      config.loadUserSettings(newUser.settings)
    },
    { flush: 'post' },
  )

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
