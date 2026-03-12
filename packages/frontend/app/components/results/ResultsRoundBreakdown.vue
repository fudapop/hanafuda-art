<template>
  <div class="px-4 py-4">
    <h2 class="mb-3 text-lg font-semibold tracking-wide text-text">
      {{ t('results.roundBreakdown') }}
    </h2>
    <HeadlessDisclosure
      as="div"
      v-for="result in rounds"
      :key="result.round"
      v-slot="{ open }"
    >
      <HeadlessDisclosureButton
        :class="[
          'flex w-full justify-between my-1 rounded-md px-4 py-2 text-left text-sm font-medium',
          'focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary dark:focus-visible:ring-accent focus-visible:ring-opacity-75',
          result.winner === selfKey
            ? 'text-black bg-hanafuda-green'
            : !result.winner
              ? 'text-text bg-surface'
              : 'text-black bg-primary',
        ]"
      >
        <span class="capitalize">
          {{ t('common.labels.round') }} {{ result.round }}:
          <span class="font-semibold tracking-wide uppercase">
            <template v-if="result.winner">
              {{ result.winner === selfKey ? t('common.labels.win') : t('common.labels.lose') }}
            </template>
            <template v-else>
              {{ t('common.labels.draw') }}
            </template>
          </span>
        </span>
        <span class="float-right font-semibold">
          {{ result.score }} {{ t('common.labels.points') }}
        </span>
        <ChevronUpIcon
          :class="open ? '' : 'rotate-180 transform'"
          class="w-5 h-5 text-text-secondary"
        />
      </HeadlessDisclosureButton>
      <HeadlessDisclosurePanel class="px-4 pt-4 pb-2 text-sm text-text-secondary">
        <YakuGrid
          v-if="result.winner"
          :completed="result.completedYaku ?? []"
          :show-cards="true"
        />
      </HeadlessDisclosurePanel>
    </HeadlessDisclosure>
  </div>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from '@heroicons/vue/20/solid'
import type { RoundResult } from '~~/stores/gameDataStore'
import type { PlayerKey } from '~~/stores/playerStore'

const { t } = useI18n()

defineProps<{
  rounds: RoundResult[]
  selfKey: PlayerKey
}>()
</script>
