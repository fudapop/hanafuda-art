<template>
  <div
    class="fixed flex flex-col w-screen px-4 text-center sm:flex-row sm:justify-between sm:text-left bottom-2"
  >
    <!-- Left side: Attribution and links -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2">
      <!-- Attribution text -->
      <div class="grid text-xs text-text-secondary">
        <p>
          Background art and design by
          <a
            href="https://www.pulpograph.studio/parishcherry"
            title="View artist's website"
            target="_blank"
            class="hover:text-primary hover:underline"
            >Parish Cherry</a
          >
        </p>
        <p>
          &copy; {{ new Date().getFullYear() }}
          <a
            href="https://www.andrehammons.dev"
            target="_blank"
            class="hover:text-primary hover:underline"
            >FudaPop</a
          >
          - Developed by
          <a
            href="https://www.andrehammons.dev"
            target="_blank"
            class="hover:text-primary hover:underline"
            >Andre Hammons</a
          >
        </p>
      </div>
    </div>

    <!-- Right side: Version -->
    <div class="text-center sm:text-right">
      <NuxtLink
        to="/changelog"
        title="View changelog"
        class="block text-xs tracking-widest transition-colors select-none hover:text-primary text-text-secondary"
      >
        {{ $config.public.version }}
      </NuxtLink>
      <!-- LEGAL LINKS -->
      <div
        class="flex items-center justify-center text-xs gap-x-2 text-text-secondary sm:justify-end"
      >
        <NuxtLink
          to="/attributions"
          title="View attributions"
          class="transition-colors hover:text-primary"
          >Attributions</NuxtLink
        >
        <span>•</span>
        <NuxtLink
          to="/terms"
          title="View terms of use"
          class="transition-colors hover:text-primary"
          >Term of Use</NuxtLink
        >
        <span>•</span>
        <NuxtLink
          to="/privacy"
          title="View privacy policy"
          class="transition-colors hover:text-primary"
          >Privacy Policy</NuxtLink
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $config } = useNuxtApp()
const { getDesignInfo } = useCardDesign()
const design = computed(() => getDesignInfo())
</script>
