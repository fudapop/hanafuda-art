<template>
  <ul
    role="list"
    class="min-w-[320px] grid p-2 gap-4 md:grid-cols-[repeat(2,minmax(360px,1fr))]"
  >
    <li v-for="yaku in completed" :key="yaku" class="relative">
      <div
        class="block w-full overflow-hidden rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <!-- CARD IMAGES -->
        <div class="[--card-height:60px] w-max pointer-events-none">
          <ListGrid :cols="'auto'" :rows="1" flow="column">
            <CardList :cards="YAKU[yaku].find(collection[winner])" :stack="true" />
          </ListGrid>
        </div>
      </div>
      <!-- YAKU TITLE -->
      <p
        class="block mt-2 text-sm font-semibold tracking-wide text-gray-900 truncate pointer-events-none"
      >
        {{ yaku.toUpperCase() }}
      </p>
      <!-- YAKU POINTS -->
      <p class="block text-sm font-medium text-gray-500 pointer-events-none">
        {{ YAKU[yaku as YakuName].points }}
        points
      </p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { PlayerKey } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { YAKU, YakuName } from "~/utils/yaku";

const { completed, winner } = defineProps<{ completed: YakuName[]; winner: PlayerKey }>();
const { collection } = storeToRefs(useCardStore());
</script>

<style scoped></style>
