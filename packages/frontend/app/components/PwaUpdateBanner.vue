<template>
  <div
    aria-live="polite"
    class="sr-only"
  >
    {{ notice === 'hidden' ? '' : message }}
  </div>
  <div
    v-if="notice !== 'hidden'"
    data-pwa-update
    :data-pwa-update-state="notice"
    class="fixed left-1/2 z-30 -translate-x-1/2 pointer-events-none px-3"
    style="top: max(0.5rem, env(safe-area-inset-top))"
  >
    <div
      class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-white/15 bg-hanafuda-brown/95 px-4 py-2 text-sm text-white shadow-lg"
    >
      <p>{{ message }}</p>
      <button
        v-if="showButton"
        type="button"
        data-pwa-update-apply
        class="shrink-0 font-semibold underline"
        @click="requestApply"
      >
        {{ t('pwa.updateNow') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PwaUpdateBlock } from '~/utils/pwaUpdate'

const { t } = useI18n()
const { notice, blocks, requestApply } = useAppUpdate()

const playBlocks = new Set<PwaUpdateBlock>(['game', 'results', 'play-again', 'lobby'])

const blockedByPlay = computed(() => blocks.value.some((block) => playBlocks.has(block)))

const message = computed(() => {
  if (notice.value === 'applying') return t('pwa.updating')
  if (blockedByPlay.value) return t('pwa.deferred')
  return t('pwa.available')
})

const showButton = computed(
  () =>
    notice.value === 'deferred' && !blockedByPlay.value && !blocks.value.includes('interaction'),
)
</script>
