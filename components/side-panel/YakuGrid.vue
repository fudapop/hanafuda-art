<template>
  <ul
    role="list"
    class="min-w-[300px] grid p-2 gap-4 sm:grid-cols-[repeat(2,minmax(300px,1fr))]"
  >
    <li
      v-for="yaku in completed"
      :key="yaku.name"
      class="relative"
    >
      <div
        class="block w-full overflow-hidden rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <!-- CARD IMAGES -->
        <div
          v-if="showCards"
          class="[--card-height:60px] w-max pointer-events-none"
        >
          <ul className="list-none grid grid-rows-1 grid-flow-col">
            <CardList
              :cards="yaku.cards"
              :stack="true"
            />
          </ul>
        </div>
      </div>
      <!-- YAKU TITLE -->
      <a
        :title="YAKU[yaku.name].description.toString()"
        class="block mt-2 text-sm font-semibold tracking-wide text-gray-900 truncate dark:text-white cursor-help"
      >
        {{ yaku.name.toUpperCase() }}
      </a>
      <!-- YAKU POINTS -->
      <p class="block text-sm font-medium text-gray-500 pointer-events-none dark:text-gray-400">
        {{ yaku.points }}
        points
      </p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { type CompletedYaku, YAKU } from '~/utils/yaku'

const { completed, showCards } = defineProps<{
  completed: CompletedYaku[]
  showCards?: boolean
}>()
</script>

<style scoped></style>
