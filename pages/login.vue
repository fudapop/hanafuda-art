<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackground />
    </div>

    <Transition
      appear
      enter-active-class="duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="loggingIn"
        class="absolute inset-0 h-full mx-auto pointer-events-none top-1/3 w-max isolate"
      >
        <SakuraLoader class="scale-[2] ml-4 origin-bottom opacity-80" />
        <div class="font-semibold tracking-wide text-center text-gray-900 animate-pulse">
          Just a moment...
        </div>
      </div>
      <div
        v-else
        class="absolute inset-0 px-4 py-12 m-auto overflow-hidden bg-white rounded-lg shadow-lg w-max h-max sm:px-6 lg:px-20 xl:px-24 dark:bg-gray-800"
      >
        <div class="max-w-sm mx-auto w-max lg:w-96">
          <div class="flex items-center justify-center">
            <img class="w-auto h-10 drop-shadow-sm" src="/images/sakura.webp" alt="New Hanafuda Logo" />
            <h2
              class="mx-4 text-2xl font-bold leading-9 tracking-wide text-gray-900 dark:text-gray-50"
            >
              Welcome!
            </h2>
            <img class="w-auto h-10 drop-shadow-sm" src="/images/sakura.webp" alt="New Hanafuda Logo" />
          </div>

          <div class="mt-10">
            <button id="guest-login-button" type="button" @click="handleLoginAsGuest" class="w-full tracking-wide shadow-md pri-btn">
              Continue as guest
            </button>

            <div class="mt-10">
              <div class="grid items-center justify-around grid-cols-3">
                <div aria-hidden="true">
                  <div class="w-full border-t border-gray-800 dark:border-gray-200" />
                </div>
                <div class="flex justify-center text-sm font-medium leading-6 w-max">
                  <span
                    class="px-6 text-gray-900 dark:text-gray-300"
                    >Or sign in with</span
                  >
                </div>
                  <div aria-hidden="true">
                    <div class="w-full border-t border-gray-800 dark:border-gray-200" />
                  </div>
              </div>

              <div class="grid gap-4 mt-6">
                <OAuthProviderButton :action="oauthAction" provider="google" :onSuccess="handleOAuthLogin" />
                <OAuthProviderButton :action="oauthAction" provider="github" :onSuccess="handleOAuthLogin" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { useToast } from "vue-toastification";
const { loginWithOAuth, loginAsGuest, linkAccount, userIsGuest } = useAuth();
const { upgradeGuestProfile, current } = useProfile();
const toast = useToast();
const loggingIn = ref<boolean>(false);

const handleLoginAsGuest = async () => {
  loggingIn.value = true;
  const toastId = toast.info("Loading your profile...");
  const guest = await loginAsGuest();
  if (guest) {
    await sleep(1000);
    toast.dismiss(toastId);
    toast.success("Good to go! Have fun!", { timeout: 2000 });
    navigateTo("/");
  }
};

const oauthAction = userIsGuest.value ? linkAccount : loginWithOAuth;

const handleOAuthLogin = () => {
  if (userIsGuest.value) {
    toast.success("Account linked! You may need to refresh your browser to update your profile.", { timeout: 8000 });
    upgradeGuestProfile(current.value!);
  } else {
    toast.success("You're signed in! Have fun!", { timeout: 2000 });
  }
  loggingIn.value = true;
  navigateTo("/");
};
</script>
