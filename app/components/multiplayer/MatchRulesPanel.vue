<template>
  <div class="text-left">
    <template v-if="editable">
      <!-- Rounds -->
      <div class="mb-5">
        <OptionsRadioGroup
          :model-value="localRules.rounds"
          :update-callback="(option) => update('rounds', option as GameLengthOptions)"
          :value-options="OPTIONS.GAME_LENGTH"
          class-name="grid grid-cols-3 gap-2 py-2"
        >
          <template #group-label>
            <span class="capitalize">{{ t('common.labels.rounds') }}</span>
          </template>
        </OptionsRadioGroup>
      </div>

      <!-- Viewings -->
      <div class="mb-5">
        <OptionsRadioGroup
          :model-value="localRules.viewings"
          :update-callback="(option) => update('viewings', option as ViewingsOptions)"
          :value-options="OPTIONS.VIEWINGS"
          :description-template="(option) => t(`settings.gameplay.viewingOptions.${option}`)"
        >
          <template #group-label>
            <a
              title="Tsukimi-/Hanami-zake"
              class="underline decoration-dotted underline-offset-4 cursor-help"
            >
              {{ t('settings.gameplay.moonFlowerViewing') }}
            </a>
          </template>
        </OptionsRadioGroup>
      </div>

      <!-- Toggle variations -->
      <div>
        <p class="mb-3 text-base font-semibold leading-6 text-text">
          {{ t('settings.gameplay.otherVariations') }}
        </p>
        <div class="space-y-3">
          <ToggleSwitch
            :callback="(v) => update('wild', v)"
            :init-value="localRules.wild"
          >
            <template #label>{{ t('settings.gameplay.wildCardSakeCup') }}</template>
            <template #description>{{ t('settings.gameplay.wildCardSakeCupDescription') }}</template>
          </ToggleSwitch>

          <ToggleSwitch
            :callback="(v) => update('double', v)"
            :init-value="localRules.double"
          >
            <template #label>{{ t('settings.gameplay.doubleOverSeven') }}</template>
            <template #description>{{ t('settings.gameplay.doubleOverSevenDescription') }}</template>
          </ToggleSwitch>
        </div>
      </div>
    </template>

    <!-- Read-only summary -->
    <template v-else>
      <ul class="divide-y divide-border/40">
        <li class="flex items-baseline justify-between gap-4 py-3">
          <span class="text-sm font-semibold text-text">{{ t('settings.gameplay.gameLength') }}</span>
          <span class="text-sm font-medium capitalize shrink-0 text-primary">
            {{ rules.rounds }} {{ t('common.labels.rounds') }}
          </span>
        </li>
        <li class="flex items-start justify-between gap-4 py-3">
          <div class="min-w-0">
            <span class="text-sm font-semibold text-text">{{ t('settings.gameplay.moonFlowerViewing') }}</span>
            <span class="block mt-0.5 text-xs text-text-secondary leading-snug">
              {{ t(`settings.gameplay.viewingOptions.${rules.viewings}`) }}
            </span>
          </div>
          <span class="pt-0.5 text-sm font-medium capitalize shrink-0 text-primary">{{ rules.viewings }}</span>
        </li>
        <li class="flex items-start justify-between gap-4 py-3">
          <div class="min-w-0">
            <span class="text-sm font-semibold text-text">{{ t('settings.gameplay.wildCardSakeCup') }}</span>
            <span class="block mt-0.5 text-xs text-text-secondary leading-snug">
              {{ t('settings.gameplay.wildCardSakeCupDescription') }}
            </span>
          </div>
          <span class="pt-0.5 text-sm font-medium capitalize shrink-0 text-primary">
            {{ rules.wild ? t('common.states.enabled') : t('common.states.disabled') }}
          </span>
        </li>
        <li class="flex items-start justify-between gap-4 py-3">
          <div class="min-w-0">
            <span class="text-sm font-semibold text-text">{{ t('settings.gameplay.doubleOverSeven') }}</span>
            <span class="block mt-0.5 text-xs text-text-secondary leading-snug">
              {{ t('settings.gameplay.doubleOverSevenDescription') }}
            </span>
          </div>
          <span class="pt-0.5 text-sm font-medium capitalize shrink-0 text-primary">
            {{ rules.double ? t('common.states.enabled') : t('common.states.disabled') }}
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore, type GameLengthOptions, type ViewingsOptions } from '~~/stores/configStore'
import type { GameRules } from '~~/types/profile'

const props = defineProps<{
  rules: GameRules
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:rules': [rules: GameRules]
}>()

const { t } = useI18n()
const { OPTIONS } = useConfigStore()

// Local copy for editable mode — not synced back from props to avoid
// recursive loops with ToggleSwitch's watchEffect firing on mount.
const localRules = reactive<GameRules>({ ...props.rules })

function update<K extends keyof GameRules>(key: K, value: GameRules[K]) {
  if (localRules[key] === value) return
  localRules[key] = value
  emit('update:rules', { ...localRules })
}
</script>
