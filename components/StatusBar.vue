<template>
  <div class="sm:flex sm:items-end sm:justify-between max-w-[850px] mx-auto">
    <div class="flex items-end space-x-2 sm:space-x-5">
      <div class="flex-shrink-0">
        <img
          v-if="user"
          class="w-16 h-16 sm:[@media_(max-height:500px)]:w-8 sm:[@media_(max-height:500px)]:h-8 mx-auto rounded-full"
          :src="user.photoURL || '/avatars/avatar-phoenix.webp'"
          :alt="user.displayName"
        />
        <img
          v-else
          src="/avatars/avatar-deer.webp"
          class="w-16 h-16 sm:[@media_(max-height:500px)]:w-8 sm:[@media_(max-height:500px)]:h-8 mx-auto rounded-full"
        />
      </div>
      <div
        class="mt-2 sm:mt-0 sm:pt-1 sm:[@media_(max-height:500px)]:flex sm:items-end sm:gap-x-4"
      >
        <p class="text-lg font-bold text-indigo-700 dark:text-white sm:text-xl">
          {{ user?.displayName?.split(" ")[0] || `Player ${playerNum}` }}
        </p>
        <p
          v-memo="[ds.roundOver, ds.roundCounter]"
          class="flex items-center text-xs font-medium text-gray-900 dark:text-white"
        >
          <span
            class="[@media_(max-height:500px)]:sr-only pt-1 mr-2 text-gray-600 dark:text-gray-300"
          >
            Round {{ ds.roundCounter }} / {{ useConfigStore().maxRounds }}
          </span>
          <span class="flex items-center text-xl font-semibold">
            <img src="/images/coin.webp" alt="coin" class="w-5 h-5 mx-1 drop-shadow-sm" />
            {{ score }}
          </span>
        </p>
        <!-- <p
          v-if="playerNum == 2"
          class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl"
        >
          {{ user?.displayName || `Player ${playerNum}` }}
        </p> -->
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
import { useFirestore } from "vuefire";
import { doc, setDoc } from "firebase/firestore";
import { convertObjArrToRecord } from "~/utils/myUtils";

const { user, playerNum } = defineProps(["user", "playerNum"]);
const ds = useGameDataStore();
const ps = usePlayerStore();
const { gameOver } = storeToRefs(ds);
const player = `p${playerNum}` as PlayerKey;
const opponent: PlayerKey = player === "p1" ? "p2" : "p1";
const score = computed(() => ds.scoreboard[player]);

const convertHistory = () => {
  const newRecord = convertObjArrToRecord(
    ds.roundHistory,
    "round",
    (keyProp: string) => `Round ${keyProp}`
  );
  for (const round in newRecord) {
    const roundRecord = newRecord[round];
    if (roundRecord.completedYaku) {
      roundRecord.completedYaku = convertObjArrToRecord(
        roundRecord.completedYaku,
        "name"
      );
    }
  }
  return newRecord;
};

const getDocRefs = () => {
  const db = useFirestore();
  const usersRef = doc(db, "users", `u_${user.uid}`);
  const gamesRef = doc(db, "recent-games", `g_${ds.gameId}`);
  return {
    db,
    usersRef,
    gamesRef,
  };
};

const getResult = () => {
  const result =
    ds.scoreboard[player] > ds.scoreboard[opponent]
      ? "WIN"
      : ds.scoreboard[player] === ds.scoreboard[opponent]
      ? "DRAW"
      : "LOSS";
  if (result === "WIN") ps.reset(player);
  return result;
};
if (user && !user.isAnonymous) {
  watch(gameOver, async () => {
    if (!gameOver.value) return;
    const result = getResult();
    const { usersRef, gamesRef } = getDocRefs();
    const record = convertHistory();
    const gameData = {
      datePlayed: new Date(),
      players: {
        p1: usersRef,
      },
      finalScores: ds.scoreboard,
      record,
    };
    await setDoc(gamesRef, {
      ...gameData,
    });
    await setDoc(
      usersRef,
      {
        lastPlayed: {
          date: gameData.datePlayed,
          result,
          gameData: gamesRef,
        },
      },
      { merge: true }
    );
    ds.generateGameId();
  });
}
</script>
