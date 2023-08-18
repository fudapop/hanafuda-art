<template>
  <div class="grid gap-y-2">
    <div
      id="user-info"
      class="grid p-4 m-3 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-700"
    >
      <div class="sm:grid sm:grid-cols-2 sm:px-8">
        <div v-if="user" class="mx-auto w-max group relative">
          <PencilSquareIcon
            class="w-5 h-auto absolute bottom-4 right-0 text-gray-400 opacity-0 group-hover:opacity-100"
          />
          <AvatarSelect v-model="avatar">
            <img
              class="w-32 h-auto sm:w-36 mx-auto my-4 rounded-full"
              :src="user.avatar"
              :alt="user.username"
            />
          </AvatarSelect>
        </div>
        <div
          class="flex flex-col justify-center text-center sm:text-left sm:items-start gap-y-5"
        >
          <input
            ref="usernameInputRef"
            class="h-10 w-full text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg ring-1 ring-yellow-300"
            v-if="editUsername"
            type="text"
            v-model="usernameInputVal"
            @keyup.enter="handleInputEnter"
          />
          <p
            v-else
            class="group relative w-full h-10 px-4 py-2 overflow-hidden text-lg font-semibold text-gray-900 dark:text-white cursor-text rounded-lg hover:ring-2 hover:ring-gray-500"
            @click="handleEdit"
          >
            {{ user?.username }}
            <PencilSquareIcon
              class="w-4 h-auto absolute inset-y-0 my-auto right-4 text-gray-400 opacity-0 group-hover:opacity-100"
            />
          </p>
          <div v-if="user?.lastPlayed">
            <p class="text-gray-900 dark:text-white px-4">
              Last played on:
              <span class="block mt-1 text-sm text-gray-500 dark:text-gray-300">{{
                useDateFormat(user.lastPlayed.date, "MMM-DD-YYYY HH:mm").value
              }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    <SignupPanel v-if="user.isGuest" />
    <div v-else class="flex flex-col items-center justify-center">
      <LoginButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useDateFormat } from "@vueuse/core";
import { PencilSquareIcon } from "@heroicons/vue/24/outline";

// const user = JSON.parse(useRoute().params.user as string);
const user = toValue(useProfile().current)!;
const avatar = computed({
  get: () => user.avatar,
  set: (url: string) => (user.avatar = url.replace(window.location.origin, "")),
});
const username = computed({
  get: () => user.username,
  set: (username: string) => (user.username = username),
});

const usernameInputRef: Ref<HTMLInputElement | null> = ref(null);
const usernameInputVal = ref(username.value);
const editUsername = ref(false);

const handleInputEnter = () => {
  username.value = usernameInputVal.value;
  editUsername.value = false;
};

const handleEdit = () => {
  editUsername.value = true;
  const cleanup = onClickOutside(usernameInputRef, () => {
    console.log("click out");
    username.value = usernameInputVal.value;
    editUsername.value = false;
  });
  const unwatch = watch(editUsername, () => {
    if (!editUsername.value) {
      cleanup?.();
      unwatch();
    }
  });
};
</script>
