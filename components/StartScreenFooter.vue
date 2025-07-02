<template>
  <div class="fixed flex justify-between w-screen gap-4 px-4 opacity-30 bottom-2">
    <div class="flex items-center gap-x-4">
      <div class="flex items-center justify-end order-last w-max gap-x-4">
        <!-- PORTFOLIO LINK -->
        <a href="https://www.andrehammons.dev" title="View my portfolio" target="_blank">
          <LogoSvg />
          <span class="sr-only"> View my portfolio </span>
        </a>

        <!-- GITHUB REPOSITORY LINK -->
        <a href="https://www.github.com/fuda-cafe/hanafuda-art" title="View project on GitHub" target="_blank">
          <svg class="w-5 h-5 mx-auto" aria-hidden="true" fill="white" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="sr-only">View project on GitHub</span>
        </a>

        <!-- ATTRIBUTION LINKS -->
        <!-- Link to creator's URL with contributor URL as fallback -->
        <!-- Example scenario: creator is known, but does not have a site. -->
        <NuxtLink
          external
          v-if="!!design.creator"
          :to="design.url || design.contributorUrl"
          :title="design.url ? 'View creator\'s portfolio' : 'View contributor\'s website'"
          target="_blank"
        >
          <Icon name="fa:paint-brush" class="w-5 h-5 mx-auto text-white" />
          <span class="sr-only">View creator's or contributor's website</span>
        </NuxtLink>
        <!-- Link to contributor's URL with creator's URL as fallback. -->
        <!-- Example scenario: contributed art is from an unknown artist. -->
        <NuxtLink
          external
          v-else-if="!!design.contributor"
          :to="design.contributorUrl || design.url"
          :title="design.url ? 'View contributor\'s website' : 'View creator\'s portfolio'"
          target="_blank"
        >
          <Icon name="fa:paint-brush" class="w-5 h-5 mx-auto text-white" />
          <span class="sr-only">View creator's or contributor's website</span>
        </NuxtLink>
      </div>
      <div class="grid text-xs text-white">
        <p v-memo="[design]" v-if="!!design.creator">Designs created by {{ design.creator }}</p>
        <p v-memo="[design]" v-else-if="!!design.contributor">Art contributed by {{ design.contributor }}</p>
        <p>&copy; {{ new Date().getFullYear() }} Site developed by Andre L. Hammons</p>
      </div>
    </div>
    <div>
      <span class="text-xs tracking-widest text-white select-none">
        {{ $config.public.version }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $config } = useNuxtApp();
const { getDesignInfo } = useCardDesign();
const design = computed(() => getDesignInfo());
</script>
