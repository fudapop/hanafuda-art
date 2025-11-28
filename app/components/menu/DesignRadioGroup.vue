<template>
  <HeadlessRadioGroup
    v-model="currentDesign"
    as="div"
    class="relative w-full @container px-4"
  >
    <div class="sticky top-0 z-10 flex justify-between px-4 py-4 shadow-xs bg-surface">
      <HeadlessRadioGroupLabel class="text-lg font-semibold tracking-wide text-text">
        {{ t('deck.selectADeck') }}
        <p class="ml-2 text-sm font-medium text-text-secondary whitespace-nowrap">
          {{ t('common.states.current') }}: {{ getDesignInfo().title }}
        </p>
      </HeadlessRadioGroupLabel>
    </div>
    <div class="grid justify-center w-full pt-4 pb-12 space-y-12">
      <HeadlessRadioGroupOption
        v-for="(design, index) in sortedDesigns"
        v-slot="{ checked }"
        :class="[
          design,
          'group rounded-xs focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-primary',
        ]"
        :value="design"
      >
        <div
          :class="[
            'grid w-full rounded-[inherit] @lg:grid-cols-[200px_1fr] place-items-center grid-rows-[200px_1fr] @lg:grid-rows-1 relative',
            checked ? 'ring-2 ring-primary' : 'ring-0',
          ]"
        >
          <!-- CARD DISPLAY -->
          <Transition
            mode="out-in"
            enter-to-class="opacity-100"
            enter-from-class="opacity-0 -scale-x-25 motion-reduce:scale-x-100"
            enter-active-class="duration-500"
            leave-to-class="opacity-0"
            leave-from-class="opacity-100"
            leave-active-class="duration-400"
          >
            <div
              v-if="!checked"
              :class="['cursor-pointer relative card down isolate drop-shadow-md mx-auto']"
            />
            <AnimatedCards v-else />
          </Transition>

          <!-- DESCRIPTION SECTION -->
          <div :class="['relative w-full @md:w-[360px] space-y-2 px-4 pb-4 rounded-xs text-text']">
            <div class="flex items-center float-right mt-6 gap-x-2">
              <!-- SELECTION INDICATOR -->
              <span
                v-if="checked"
                :aria-label="t('common.states.selected')"
                class=""
              >
                <span class="sr-only">{{ t('common.states.selected') }}</span>
                <CheckCircleIcon
                  aria-hidden
                  class="size-5 text-primary"
                />
              </span>
            </div>
            <DesignDescription :design="design" />
          </div>
          <div
            v-if="index < DESIGNS.length - 1"
            class="absolute bottom-0 left-0 right-0"
          >
            <div class="relative">
              <div
                class="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div class="w-[90%] mx-auto mt-12 border-b border-border opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </HeadlessRadioGroupOption>
    </div>
  </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/20/solid'

const { DESIGNS, currentDesign, getDesignInfo, saveDesignToStorage } = useCardDesign()
const { t } = useI18n()

const sortedDesigns = computed(() => [...DESIGNS])

onMounted(() => {
  // Watch for design changes and persist to localStorage
  watch(
    currentDesign,
    (newDesign) => {
      if (newDesign) {
        saveDesignToStorage(newDesign)
      }
    },
    { immediate: false },
  )
})

onUnmounted(() => {
  saveDesignToStorage(currentDesign.value)
})
</script>
