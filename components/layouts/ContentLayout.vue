<template>
  <div class="min-h-screen">
    <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackground />
    </div>
    <div class="sticky top-0 z-[5] flex items-center h-20 bg-black/50 backdrop-blur-sm">
      <NuxtLink
        to="/"
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        ← Back to Game
      </NuxtLink>
    </div>
    <slot />
  </div>
</template>
