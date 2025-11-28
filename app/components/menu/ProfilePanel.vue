<template>
  <div class="flex flex-col pb-12 overflow-x-hidden">
    <div
      id="user-info"
      class="grid p-4 mx-3"
    >
      <div class="sm:grid sm:grid-cols-2 sm:px-8">
        <!-- Avatar -->
        <div class="relative mx-auto w-max">
          <img
            class="w-32 h-auto mx-auto my-2 border rounded-full sm:my-4 sm:w-36 border-border drop-shadow-xs"
            :src="avatar"
            :alt="username"
          />
        </div>

        <!-- User Info -->
        <div class="flex flex-col justify-center text-center sm:text-left sm:items-start gap-y-2">
          <!-- Username (display only, not editable in demo) -->
          <div class="text-lg font-semibold text-text px-2">
            {{ username }}
          </div>

          <!-- Demo Mode Notice -->
          <div class="px-2 text-sm text-text-secondary">
            {{ t('demo.playingDemo') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Deck Info -->
    <div class="mx-4 my-6 p-4 bg-surface/50 rounded-md border border-border/30">
      <div class="flex flex-col items-center gap-3">
        <div class="w-16 h-auto">
          <DeckShowcase
            design="otwarte-karty"
            :interval-in-ms="5000"
            auto-reveal
          />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-text">{{ getDesignInfo().title }}</h3>
          <p class="text-sm text-text-secondary">{{ getDesignInfo().description }}</p>
          <a
            v-if="getDesignInfo().url"
            :href="getDesignInfo().url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary hover:underline"
          >
            {{ getDesignInfo().urlDescription }}
          </a>
        </div>
      </div>
    </div>

    <!-- Link to Full Game -->
    <div class="mx-4 mt-auto pt-8 pb-4 text-center">
      <p class="text-sm text-text-secondary mb-2">
        {{ t('demo.wantMoreFeatures') }}
      </p>
      <a
        href="https://newhanafuda.art"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
      >
        {{ t('demo.playFullGame') }}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const user = useProfile().current
const { getDesignInfo } = useCardDesign()

const avatar = computed(() => user.value?.avatar ?? '')
const username = computed(() => user.value?.username ?? t('common.labels.guest'))
</script>
