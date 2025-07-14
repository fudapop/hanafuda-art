<template>
  <div class="min-h-screen">
    <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackgroundImages />
    </div>
    <button
      v-if="!isSignIn"
      :class="[
        'fixed w-10 h-10 transition-all duration-300 rounded-md top-4 left-4 place-content-center z-20',
        'bg-black/20 hover:bg-black/30 hover:scale-105',
      ]"
    >
      <NuxtLink to="/">
        <Icon
          name="mdi:arrow-left"
          class="w-5 h-5 text-white transition-transform duration-300"
        />
        <span class="sr-only">Back to title screen</span>
      </NuxtLink>
    </button>
    <slot />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isSignIn = computed(() => route.path === '/sign-in')
</script>
