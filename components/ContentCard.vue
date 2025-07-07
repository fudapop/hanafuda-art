<template>
  <div class="relative max-w-4xl min-h-screen px-4 py-8 mx-auto">
    <div class="p-6 bg-white rounded-lg shadow-lg sm:p-8 lg:p-12 dark:bg-gray-800">
      <div class="max-w-3xl mx-auto">
        <div class="h-full prose prose-gray dark:prose-invert max-w-none">
          <slot />
        </div>
        <div class="pt-8 mt-12 border-t border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <NuxtLink
              to="/"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              &larr; Back to title screen
            </NuxtLink>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              © {{ new Date().getFullYear() }} FudaPop. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
