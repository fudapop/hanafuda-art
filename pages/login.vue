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
        <div class="max-w-sm mx-auto min-w-[300px] w-[90vw] lg:w-96">

          <div class="relative my-auto drop-shadow-xl">
            <h1 id="login-title" class="text-4xl text-center">
              <span class="block ml-16 text-xl italic text-left text-gray-700 dark:text-white">Hanafuda</span
              >花札 KOI-KOI
            </h1>
          </div>

          <div class="mt-10">
            <div class="flex-col space-y-8">
              <button id="guest-login-button" type="button" @click="handleLoginAsGuest" class="w-full tracking-wide shadow-md sec-btn">
                Continue as guest
              </button>
                          
              <form class="space-y-4 min-w-[300px] border-t pt-4 border-gray-400/20" action="" @submit.prevent="handleEmailLogin">
                <div>
                  <label for="email" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Email address</label>
                  <div class="mt-1">
                    <input id="email" ref="email" name="email" type="email" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" v-model="values.email" @blur="rememberEmail" />
                  </div>
                </div>

                <div>
                  <label for="password" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Password</label>
                  <div class="mt-1">
                    <input id="password" ref="password" name="password" type="password" autocomplete="current-password" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" v-model="values.password" />
                  </div>
                </div>

                <div :class="{'flex items-center justify-between': true, 'opacity-0 pointer-events-none': newAccount}">
                  <div class="flex items-center">
                    <input id="remember-me" ref="remember-me" name="remember-me" type="checkbox" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600" v-model="rememberMe" @change="rememberEmail"/>
                    <label for="remember-me" class="block ml-3 text-sm leading-6 text-gray-900 dark:text-white">Remember me</label>
                  </div>

                  <div class="text-sm leading-6">
                    <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-500" @click="handleForgotPassword">Forgot password?</a>
                  </div>
                </div>

                <div>
                  <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                    {{ newAccount ? "Sign up" : "Sign in" }}
                  </button>
                  <a href="#" class="block w-full mt-2 text-sm text-center text-indigo-500 hover:text-indigo-400" @click="newAccount = !newAccount">
                    {{`I ${ newAccount ? "already" : "don't"} have an account`}} &rarr;
                  </a>
                </div>
              </form>

            </div>

            <div class="mt-8">
              <div class="grid items-center grid-cols-[1fr_1fr_1fr] w-full">
                <div aria-hidden="true">
                  <div class="w-full border-t border-gray-800 dark:border-gray-400/20" />
                </div>
                <div class="flex justify-center text-sm font-medium leading-6 w-max">
                  <span
                    class="px-6 text-gray-900 dark:text-gray-300"
                    >{{ `or ${newAccount ? "sign up" : "sign in"} with` }}</span
                  >
                </div>
                  <div aria-hidden="true">
                    <div class="w-full border-t border-gray-800 dark:border-gray-400/20" />
                  </div>
              </div>

              <div class="grid gap-4 pt-4 xs:grid-cols-2">
                <OAuthProviderButton :action="oauthAction" provider="google" :onSuccess="handleOAuthLogin" />
                <OAuthProviderButton :action="oauthAction" provider="github" :onSuccess="handleOAuthLogin" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <LazyPasswordResetForm :open="showResetModal" @cancel="() => showResetModal = false" @sent="() => toast.success('Password reset email sent! Check your inbox.')" />
  </div>
</template>
<script setup lang="ts">
import { useToast } from "vue-toastification";
import { useStorage } from "@vueuse/core";
const { loginWithOAuth, loginAsGuest, linkAccount, userIsGuest, linkWithEmail, loginWithEmail, signUpWithEmail, resetPassword } = useAuth();
const { upgradeGuestProfile, current } = useProfile();
const toast = useToast();
const loggingIn = ref<boolean>(false);
const newAccount = ref<boolean>(false);
const rememberedEmail = useStorage("hanafuda-email", "", localStorage, { mergeDefaults: true });
const rememberMe = ref<boolean>(rememberedEmail.value !== "");
const rememberEmail = () => {
  rememberedEmail.value = rememberMe.value ? values.email : "";
};
const values = reactive({
  email: rememberedEmail.value,
  password: "",
});

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

const emailAction = userIsGuest.value ? linkWithEmail : newAccount.value ? signUpWithEmail : loginWithEmail;

const handleEmailLogin = () => {
  loggingIn.value = true;
  emailAction(values.email, values.password)
    .then((success) => {
      if (success) {
        if (userIsGuest.value) {
          toast.success("Account linked! You may need to refresh your browser to update your profile.", { timeout: 8000 });
          upgradeGuestProfile(current.value!);
        } else {
          toast.success("You're signed in! Have fun!", { timeout: 2000 });
        }
        navigateTo("/");
      } else {
        loggingIn.value = false;
      }
    });
};

const showResetModal = ref(false);
const handleForgotPassword = () => {
  showResetModal.value = true;
};
</script>

<style scoped>
#login-title {
  background: linear-gradient(15deg, gold, goldenrod, yellow);
  background-clip: text;
  color: transparent;
  font-family: "Potta One", sans-serif;
  font-weight: 700;
  max-width: 500px;
  margin: 0 auto;
  z-index: 1;
}
@media (prefers-color-scheme: dark) {
  #login-title {
    background: linear-gradient(15deg, gold, palegoldenrod, lightgoldenrodyellow);
    background-clip: text;
    color: transparent;
    font-family: "Potta One", sans-serif;
    font-weight: 700;
    max-width: 500px;
    margin: 0 auto;
    z-index: 1;
  }
}
</style>