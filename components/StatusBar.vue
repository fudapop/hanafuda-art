<template>
  <div class="sm:flex sm:items-center sm:justify-between">
    <div class="flex items-end space-x-2 sm:space-x-5">
      <div class="flex-shrink-0">
        <img
          v-if="user"
          class="w-16 h-16 mx-auto rounded-full"
          :src="user.photoURL"
          :alt="user.displayName"
        />
        <!-- <div v-else class="w-16 h-16 mx-auto rounded-full"></div> -->
      </div>
      <div class="mt-4 sm:mt-0 sm:pt-1">
        <div class="opacity-100">
          <p class="text-sm font-medium text-white">
            {{ user?.displayName || `Player ${playerNum}` }}
          </p>
          <p
            v-memo="[ds.roundOver, ds.roundCounter]"
            class="text-xl font-bold text-black sm:text-2xl"
          >
            Round {{ ds.roundCounter }} | Score: {{ score }}
          </p>
        </div>
      </div>
    </div>
    <div v-if="playerNum == 1" class="flex justify-center mt-5 sm:mt-0 z-[-1]">
      <!-- <a
        href="#"
        class="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >View Progress</a
      > -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameDataStore } from "~/stores/gameDataStore";
import { PlayerKey } from "~/stores/playerStore";

const { user, playerNum } = defineProps(["user", "playerNum"]);
const ds = useGameDataStore();
const player = `p${playerNum}` as PlayerKey;
const score = computed(() => ds.scoreboard[player]);
</script>

<style scoped></style>
