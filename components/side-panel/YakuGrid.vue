<template>
  <div
    class="min-w-[300px]"
    v-if="!!focusedYaku"
  >
    <div
      class="block w-full overflow-y-visible rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-border"
    >
      <!-- CARD IMAGES -->
      <div
        v-if="showCards"
        class="[--card-height:100px] w-full"
      >
        <ul className="list-none flex items-center flex-wrap max-w-full">
          <CardList
            :cards="focusedYaku.cards"
            :stack="false"
            itemClass="transition-transform duration-200 motion-safe:hover:-translate-y-[5%] motion-safe:hover:scale-150 motion-safe:hover:z-10"
          />
        </ul>
      </div>
    </div>
    <!-- YAKU TITLE -->
    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center gap-x-4">
        <a
          :title="YAKU[focusedYaku.name].description.toString()"
          class="block text-sm font-semibold tracking-wide truncate text-text cursor-help"
        >
          {{ focusedYaku.name.toUpperCase() }}
        </a>
        <!-- YAKU POINTS -->
        <p class="block text-sm font-medium pointer-events-none text-text">
          {{ focusedYaku.points }}
          points
        </p>
      </div>

      <button
        class="sec-btn"
        @click="focusedYaku = null"
      >
        Back
      </button>
    </div>
  </div>
  <ul
    v-else
    role="list"
    class="min-w-[300px] grid p-2 gap-4 sm:grid-cols-[repeat(2,minmax(300px,1fr))]"
  >
    <li
      v-for="yaku in completed"
      :key="yaku.name"
      class="relative"
    >
      <div
        class="block w-full overflow-hidden rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-border"
      >
        <!-- CARD IMAGES -->
        <div
          v-if="showCards"
          class="[--card-height:60px] w-full pointer-events-none"
        >
          <ul className="list-none flex items-center justify-start flex-wrap max-w-full">
            <CardList
              :cards="yaku.cards"
              :stack="true"
            />
          </ul>
        </div>
      </div>
      <!-- YAKU TITLE -->
      <div class="flex items-center mt-2 gap-x-4">
        <div class="flex flex-col">
          <a
            :title="YAKU[yaku.name].description.toString()"
            class="block text-sm font-semibold tracking-wide truncate text-text cursor-help"
          >
            {{ yaku.name.toUpperCase() }}
          </a>
          <!-- YAKU POINTS -->
          <p class="block text-sm font-medium pointer-events-none text-text">
            {{ yaku.points }}
            points
          </p>
        </div>
        <button
          button-class="secondary"
          @click="focusedYaku = yaku"
        >
          <MagnifyingGlassIcon class="w-4 h-4" />
          <span class="sr-only">View Cards</span>
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { type CompletedYaku, YAKU } from '~/utils/yaku'

const { completed, showCards } = defineProps<{
  completed: CompletedYaku[]
  showCards?: boolean
}>()

const focusedYaku: Ref<CompletedYaku | null> = ref(null)
</script>
