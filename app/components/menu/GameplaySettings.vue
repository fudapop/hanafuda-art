<template>
  <div
    ref="settingsPanel"
    class="h-full px-8 py-8"
  >
    <!-- Demo Mode: Show locked gameplay rules -->
    <div class="w-full mb-8">
      <p class="my-4 text-text-secondary">
        <LockClosedIcon class="inline w-6 h-6 align-text-bottom" />
        {{ t('settings.notices.demoSettingsLocked') }}
      </p>
      <ul class="grid w-full mx-auto gap-y-4">
        <li class="flex justify-between leading-6 text-text">
          <span class="font-semibold"> {{ t('settings.gameplay.gameLength') }} </span>
          <span class="capitalize text-primary">
            {{ config.maxRounds }} {{ t('common.labels.rounds') }}
          </span>
        </li>
        <li class="flex justify-between leading-6 text-text">
          <div>
            <span class="font-semibold"> {{ t('settings.gameplay.moonFlowerViewing') }} </span>
            <span class="block w-3/4 pl-2 text-sm text-text-secondary">
              {{ t('settings.gameplay.viewingOptions.allow') }}
            </span>
          </div>
          <span class="self-center capitalize text-primary">
            {{ t('common.states.enabled') }}
          </span>
        </li>
        <li class="flex justify-between leading-6 text-text">
          <div>
            <span class="font-semibold"> {{ t('settings.gameplay.wildCardSakeCup') }} </span>
          </div>
          <span class="self-center capitalize text-primary">
            {{ t('common.states.disabled') }}
          </span>
        </li>
        <li class="flex justify-between leading-6 text-text">
          <div>
            <span class="font-semibold"> {{ t('settings.gameplay.doubleOverSeven') }} </span>
          </div>
          <span class="self-center capitalize text-primary">
            {{ t('common.states.disabled') }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Interface Settings (always editable) -->
    <div class="space-y-4 pb-20 pt-8 border-t border-border">
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
} from '~~/stores/configStore'

const { t } = useI18n()
const config = useConfigStore()
const settingsPanel: Ref<HTMLElement | null> = ref(null)
const settingsUpdated = ref(false)

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

  await updateProfile({
    settings: { ...config.getCurrentSettings },
  })
  settingsUpdated.value = false
}

onMounted(async () => {
  if (!config.settingsLoaded && user.value?.settings) {
    config.loadUserSettings(user.value.settings)
  }

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
    const cleanup = onClickOutside(settingsPanel, () => {
      saveSettings()
      cleanup?.()
    })
  })
})
</script>
