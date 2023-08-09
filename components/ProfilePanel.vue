<template>
  <div class="grid sm:grid-cols-2">
    <div
      class="grid h-full p-4 m-3 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-sm"
    >
      <!-- TODO: Profile Info -->
      <div v-if="user">
        <img
          v-if="user.photoURL"
          class="w-20 h-20 mx-auto my-4 rounded-full"
          :src="user.photoURL"
          :alt="user.displayName ?? ''"
        />
        <img
          v-else
          src="/images/sakura.webp"
          class="object-contain object-center mx-auto rounded-full"
        />
      </div>
      <p
        class="px-4 overflow-hidden text-lg text-gray-900 dark:text-white font-semibold text-center"
      >
        {{ user?.displayName }}
      </p>
      <div v-if="profile">
        <p class="text-center text-gray-900 dark:text-white">
          Last played on:
          <span class="block mt-1 text-sm text-gray-500 dark:text-gray-300">{{
            useDateFormat(profile.lastPlayed.date.toDate(), "MMM-DD-YYYY HH:mm").value
          }}</span>
        </p>
      </div>
    </div>
    <div class="m-auto">
      <LoginButton class="m-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";
import { doc } from "firebase/firestore";

const user = useCurrentUser();
const profile = useDocument(doc(useFirestore(), "users", `u_${user.value?.uid}`), {
  maxRefDepth: 1,
});
</script>

<style scoped></style>
