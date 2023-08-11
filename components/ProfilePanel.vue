<template>
  <div class="grid gap-y-2 sm:grid-cols-2">
    <div
      class="grid h-full p-4 m-3 bg-white border rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600"
    >
      <div v-if="user">
        <img
          v-if="user.photoURL"
          class="w-20 h-20 mx-auto my-4 rounded-full"
          :src="user.photoURL"
          :alt="user.displayName ?? ''"
        />
        <img
          v-else
          src="/avatars/avatar-phoenix.webp"
          class="w-20 h-20 mx-auto my-4 rounded-full"
        />
      </div>
      <p
        class="px-4 overflow-hidden text-lg font-semibold text-center text-gray-900 dark:text-white"
      >
        {{ user?.displayName || `Guest #${user?.uid.slice(-5)}` }}
      </p>
      <div v-if="profile">
        <p class="text-center text-gray-900 dark:text-white">
          Last played on:
          <span class="block mt-1 text-sm text-gray-500 dark:text-gray-300">{{
            useDateFormat(profile?.lastPlayed?.date.toDate(), "MMM-DD-YYYY HH:mm").value
          }}</span>
        </p>
      </div>
    </div>
    <SignupPanel v-if="userIsGuest" />
    <div v-else class="flex flex-col items-center justify-center">
      <LoginButton />
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

// TODO: Finish sign up for anonymous users
const userIsGuest = computed(() => user.value?.isAnonymous);
</script>

<style scoped></style>
