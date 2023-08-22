<template>
  <div class="min-h-screen">
    <!-- <div v-if="user" class="absolute z-50 mx-auto top-8">
      <ToastAlert />
    </div> -->
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
        v-if="user !== null"
        class="absolute inset-0 h-full mx-auto pointer-events-none top-1/3 w-max isolate"
      >
        <SakuraLoader class="scale-[2] origin-bottom opacity-80" />
        <div class="font-semibold tracking-wide text-center text-gray-900 animate-pulse">
          Just a moment...
        </div>
      </div>
      <div
        v-else
        class="absolute inset-0 px-4 py-12 m-auto overflow-hidden bg-white rounded-lg w-max h-max sm:px-6 lg:px-20 xl:px-24 dark:bg-gray-800"
      >
        <div class="max-w-sm mx-auto w-max lg:w-96">
          <div class="flex items-center">
            <img class="w-auto h-10" src="/images/sakura.webp" alt="New Hanafuda Logo" />
            <h2
              class="ml-4 text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-50 dark:bg-gray-800"
            >
              Welcome!
            </h2>
          </div>
          <!-- <p class="mt-2 text-sm leading-6 text-gray-500">
            Not a member?
            {{ " " }}
            <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-500"
              >Start a 14 day free trial</a
            >
          </p> -->

          <div class="mt-10">
            <!-- <div v-if="false">
            <form action="#" method="POST" class="space-y-6">
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium leading-6 text-gray-900"
                  >Email address</label
                >
                <div class="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    class="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label
                  for="password"
                  class="block text-sm font-medium leading-6 text-gray-900"
                  >Password</label
                >
                <div class="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600"
                  />
                  <label
                    for="remember-me"
                    class="block ml-3 text-sm leading-6 text-gray-700"
                    >Remember me</label
                  >
                </div>

                <div class="text-sm leading-6">
                  <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-500"
                    >Forgot password?</a
                  >
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div> -->
            <button type="button" @click="login" class="w-full pri-btn">
              Continue as guest
            </button>

            <div class="mt-10">
              <div class="relative">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                  <div class="w-full border-t border-gray-200" />
                </div>
                <div class="relative flex justify-center text-sm font-medium leading-6">
                  <span
                    class="px-6 text-gray-900 bg-white dark:text-gray-300 dark:bg-gray-800"
                    >Or sign in with</span
                  >
                </div>
              </div>

              <div class="grid gap-4 mt-6">
                <button
                  type="button"
                  @click="() => loginWithOAuth('google')"
                  class="flex w-full items-center justify-center gap-3 rounded-md bg-[#3367D6] px-3 py-1.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]"
                >
                  <svg
                    class="w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="31.27"
                    height="32"
                    viewBox="0 0 256 262"
                  >
                    <path
                      fill="#4285F4"
                      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    />
                    <path
                      fill="#34A853"
                      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    />
                    <path
                      fill="#FBBC05"
                      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                    />
                    <path
                      fill="#EB4335"
                      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    />
                  </svg>
                  <span class="text-sm font-semibold leading-6">Google</span>
                </button>

                <button
                  type="button"
                  @click="() => loginWithOAuth('github')"
                  class="flex w-full items-center justify-center gap-3 rounded-md bg-[#24292F] px-3 py-1.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]"
                >
                  <svg
                    class="w-5 h-5"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-sm font-semibold leading-6">GitHub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { useAsyncState } from "@vueuse/core";
const { loginWithOAuth, loginAsGuest } = useAuth();
const redirectUrl = (useRoute().query.redirect || "/") as string;
const userState = useAsyncState(getCurrentUser(), undefined);
const user = computed(() => userState.state.value);

const login = async () => {
  const guest = await loginAsGuest();
  if (guest) navigateTo(redirectUrl);
};

watch(user, () => {
  if (user.value) {
    navigateTo(redirectUrl);
  }
});
</script>
