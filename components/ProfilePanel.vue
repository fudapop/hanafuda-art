<template>
  <div class="grid gap-y-4">
    <div id="user-info" class="grid p-4 mx-3">
      <div class="sm:grid sm:grid-cols-2 sm:px-8">
        <!-- Avatar -->
        <div v-if="user" class="relative mx-auto w-max group">
          <PencilSquareIcon
            class="absolute right-0 w-5 h-auto text-gray-400 opacity-50 bottom-4 group-hover:opacity-100"
          />
          <AvatarSelect v-model="avatar">
            <img
              class="w-32 h-auto mx-auto my-2 rounded-full sm:my-4 sm:w-36"
              :src="user.avatar"
              :alt="user.username"
            />
          </AvatarSelect>
        </div>

        <!-- START User Info Panel-->
        <div
          class="flex flex-col justify-center text-center sm:text-left sm:items-start gap-y-2"
        >
          <!-- Username -->
          <input
            ref="usernameInputRef"
            class="w-full h-10 text-lg text-gray-900 bg-white rounded-lg dark:bg-gray-900 dark:text-white ring-1 ring-yellow-300"
            v-if="editUsername"
            type="text"
            v-model="usernameInputVal"
            @keyup.enter="handleInputEnter"
          />
          <p
            v-else
            class="relative w-full h-10 px-4 py-2 overflow-hidden text-lg font-semibold text-gray-900 rounded-lg group dark:text-white cursor-text hover:ring-2 hover:ring-gray-500"
            @click="handleEdit"
          >
            {{ user?.username }}
            <PencilSquareIcon
              class="absolute inset-y-0 w-4 h-auto my-auto text-gray-400 opacity-50 right-4 group-hover:opacity-100"
            />
          </p>

          <!-- Player Coins -->
          <div
            v-if="user?.record"
            class="flex items-center justify-center px-4 gap-x-2 sm:justify-start"
          >
            <img src="/images/coin.webp" alt="coin" class="w-5 h-5" />
            <p class="text-lg font-semibold text-gray-900 select-none dark:text-white">
              {{ user.record.coins }}
            </p>
          </div>

          <!-- Last Played -->
          <div v-if="user">
            <p class="px-4 text-gray-900 dark:text-white">
              Last updated:
              <span class="block mt-1 text-sm text-gray-500 dark:text-gray-300">{{
                useDateFormat(user.lastUpdated, "MMM-DD-YYYY HH:mm").value
              }}</span>
            </p>
          </div>
        </div>
        <!-- END User Info Panel-->
      </div>
    </div>

    <!-- Player Record -->
    <div
      v-if="user?.record"
      class="px-8 grid sm:grid-cols-[20%_1fr] items-center mx-3 rounded-lg shadow-inner bg-gray-50 dark:bg-[#40495a]"
    >
      <h3
        class="mt-2 text-base font-semibold leading-6 text-center text-gray-500 sm:text-left sm:text-lg dark:text-gray-300"
      >
        Player Record
      </h3>
      <dl class="flex justify-around">
        <div
          v-for="(val, key) in record"
          :key="key"
          class="px-4 py-3 overflow-hidden sm:py-5 sm:p-6"
        >
          <dt class="text-sm font-medium text-gray-500 truncate dark:text-gray-300">
            {{ key }}
          </dt>
          <dd
            class="text-lg font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-50"
          >
            {{ val }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- Account sign-in/out -->
    <div class="[@media(max-height:_500px)]:hidden">
      <div v-if="user.isGuest" class="mx-auto w-max">
        <ExclamationCircleIcon class="w-6 h-6 inline align-top" />
        <p class="inline ml-2 text-sm">Sign in is required to save your profile.</p>
        <SignupPanel class="mt-2" />
      </div>
      <div v-else class="flex flex-col items-center justify-center">
        <LoginButton />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useDateFormat } from "@vueuse/core";
import { PencilSquareIcon, ExclamationCircleIcon } from "@heroicons/vue/24/outline";

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
const record = computed(() => ({
  wins: user.record.win,
  losses: user.record.loss,
  draws: user.record.draw,
}));

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
