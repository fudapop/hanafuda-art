<template>
  <ul
    role="list"
    class="min-w-[300px] grid p-2 gap-4 sm:grid-cols-[repeat(2,minmax(300px,1fr))]"
  >
    <li v-for="yaku in completed" :key="yaku.name" class="relative">
      <div
        class="block w-full overflow-hidden rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <!-- CARD IMAGES -->
        <div v-if="showCards" class="[--card-height:60px] w-max pointer-events-none">
          <ListGrid :cols="'auto'" :rows="1" flow="column">
            <CardList :cards="yaku.cards" :stack="true" />
          </ListGrid>
        </div>
      </div>
      <!-- YAKU TITLE -->
      <p
        class="block mt-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-white truncate pointer-events-none"
      >
        {{ yaku.name.toUpperCase() }}
      </p>
      <!-- YAKU POINTS -->
      <p
        class="block text-sm font-medium text-gray-500 dark:text-gray-400 pointer-events-none"
      >
        {{ yaku.points }}
        points
      </p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { CompletedYaku } from "~/utils/yaku";

const { completed, showCards } = defineProps<{
  completed: CompletedYaku[];
  showCards?: boolean;
}>();
</script>

<style scoped></style>
