<template>
  <div class="sm:flex sm:items-end sm:justify-between max-w-[850px] mx-auto">
    <div class="flex items-end space-x-2 sm:space-x-5">
      <div class="flex-shrink-0">
        <img v-if="user"
          class="w-16 h-16 sm:[@media_(max-height:500px)]:w-8 sm:[@media_(max-height:500px)]:h-8 mx-auto rounded-full"
          :src="user.avatar" :alt="user.username" />
        <img v-else :src="avatar2"
          class="w-16 h-16 sm:[@media_(max-height:500px)]:w-8 sm:[@media_(max-height:500px)]:h-8 mx-auto rounded-full" />
      </div>
      <div class="mt-2 sm:mt-0 sm:pt-1 sm:[@media_(max-height:500px)]:flex sm:items-end sm:gap-x-4">
        <p class="text-lg font-bold text-indigo-700 dark:text-white sm:text-xl">
          {{ user?.username || `Player ${playerNum}` }}
        </p>
        <p class="flex items-center text-xs font-medium text-gray-900 dark:text-white">
          <span class="[@media_(max-height:500px)]:sr-only pt-1 mr-2 text-gray-600 dark:text-gray-300">
            Round {{ ds.roundCounter }} / {{ useConfigStore().maxRounds }}
          </span>
          <span class="flex items-center text-xl font-semibold" v-memo="[ds.roundOver, useState('start').value]">
            <img src="/images/coin.webp" alt="coin" class="w-5 h-5 mx-1 drop-shadow-sm" />
            {{ score }}
          </span>
        </p>
      </div>
    </div>
    <div v-if="playerNum == 1" class="flex justify-center mt-5 sm:mt-0 z-[-1]"></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGameDataStore } from "~/stores/gameDataStore";
import { useConfigStore } from "~/stores/configStore";
import { PlayerKey, usePlayerStore } from "~/stores/playerStore";

const { user, playerNum } = defineProps(["user", "playerNum"]);
const ds = useGameDataStore();
const ps = usePlayerStore();
const { gameOver } = storeToRefs(ds);
const player = `p${playerNum}` as PlayerKey;
const opponent: PlayerKey = player === "p1" ? "p2" : "p1";
const score = computed(() => ds.scoreboard[player]);

const avatars = [
  "/avatars/origami-crane.webp",
  "/avatars/origami-warbler.webp",
  "/avatars/origami-curtain.webp",
  "/avatars/origami-cuckoo.webp",
  "/avatars/origami-bridge.webp",
  "/avatars/origami-butterflies.webp",
  "/avatars/origami-boar.webp",
  "/avatars/origami-deer.webp",
  "/avatars/origami-rainman.webp",
  "/avatars/origami-phoenix.webp",
];
const avatar2 = getRandom(avatars);

const getResult = () => {
  const result =
    ds.scoreboard[player] > ds.scoreboard[opponent]
      ? "win"
      : ds.scoreboard[player] === ds.scoreboard[opponent]
        ? "draw"
        : "loss";
  if (result === "win") ps.reset(player);
  return result;
};
if (user) {
  watch(gameOver, async () => {
    if (!gameOver.value) return;
    const date = new Date();
    const result = getResult();
    const currentUser = toValue(useProfile().current);
    if (currentUser) {
      currentUser.record[result]++;
      console.log("score:", ds.scoreboard.p1)
      currentUser.record.coins += ds.scoreboard.p1;
      currentUser.lastPlayed = {
        date,
        result,
      }
    }
    ds.generateGameId();
  });
}
</script>
