<template>
  <div class="relative max-w-4xl min-h-screen py-8 mx-auto">
    <div class="py-6 rounded-lg shadow-lg bg-background sm:py-8 lg:py-12 text-text">
      <div class="max-w-3xl mx-auto">
        <div :class="['h-full prose prose-gray dark:prose-invert max-w-none', padded && 'px-6']">
          <slot />
        </div>
        <div class="pt-8 mt-12 border-t border-border">
          <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p class="text-sm text-text-secondary">
              © {{ new Date().getFullYear() }} FudaPop. All rights reserved.
            </p>
            <!-- LEGAL LINKS -->
            <div
              class="flex items-center justify-center text-xs gap-x-2 text-text-secondary sm:justify-end"
            >
              <NuxtLink
                to="/changelog"
                class="transition-colors hover:text-primary"
                >Changelog</NuxtLink
              >
              <span>•</span>
              <NuxtLink
                to="/attributions"
                class="transition-colors hover:text-primary"
                >Attributions</NuxtLink
              >
              <span>•</span>
              <NuxtLink
                to="/terms"
                class="transition-colors hover:text-primary"
                >Term of Use</NuxtLink
              >
              <span>•</span>
              <NuxtLink
                to="/privacy"
                class="transition-colors hover:text-primary"
                >Privacy Policy</NuxtLink
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { padded = true } = defineProps<{
  padded?: boolean
}>()
</script>
