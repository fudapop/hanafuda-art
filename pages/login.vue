<template>
  <div class="min-h-screen">
    <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackground />
    </div>

    <Teleport to="body">
      <!-- UI TOGGLE BUTTONS -->
      <div class="absolute right-3 grid text-white min-w-[48px] top-20">
        <ColorModeToggle />
      </div>
    </Teleport>

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
        class="absolute inset-0 px-4 py-8 m-auto overflow-hidden bg-white rounded-lg shadow-lg w-max h-max sm:px-6 lg:px-20 xl:px-24 dark:bg-gray-800"
      >
        <div class="max-w-sm mx-auto min-w-[300px] w-[90vw] lg:w-96">
          <div class="relative my-auto drop-shadow-xl">
            <h1
              id="login-title"
              class="text-4xl text-center"
            >
              <span class="block ml-16 text-xl italic text-left text-gray-700 dark:text-white"
                >Hanafuda</span
              >花札 KOI-KOI
            </h1>
          </div>

          <div class="mt-10 space-y-5">
            <EmailLoginForm
              @success="handleLoginSuccess"
              @linked="handleLinked"
              @error="handleLoginError"
            />

            <OAuthSignupForm
              v-if="currentUser"
              @success="handleLinked"
              @error="handleLoginError"
            />
            <OAuthLoginForm
              v-else
              @success="handleLoginSuccess"
              @error="handleLoginError"
            />

            <div class="w-full text-sm text-center">
              <NuxtLink
                :external="!currentUser"
                to="/"
                class="text-indigo-500 hover:text-indigo-400"
              >
                Continue as guest
              </NuxtLink>
            </div>

            <!-- Legal Links -->
            <div class="w-full space-x-4 text-xs text-center text-gray-500 dark:text-gray-400">
              <NuxtLink
                to="/terms"
                class="underline hover:text-gray-700 dark:hover:text-gray-200"
              >
                Terms of Use
              </NuxtLink>
              <NuxtLink
                to="/privacy"
                class="underline hover:text-gray-700 dark:hover:text-gray-200"
              >
                Privacy Policy
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { useToast } from 'vue-toastification'
const { loginAsGuest } = useAuth()
const { upgradeGuestProfile, current: currentUser } = useProfile()
const toast = useToast()
const loggingIn = ref<boolean>(true)

const handleLinked = () => {
  if (!currentUser.value) {
    toast.error('Failed to link account. Please try again.', { timeout: 8000 })
    return
  }
  loggingIn.value = true
  toast.success('Account linked! You may need to refresh your browser to update your profile.', {
    timeout: 8000,
  })
  upgradeGuestProfile(currentUser.value!)
  navigateTo('/')
}

const handleLoginSuccess = () => {
  loggingIn.value = true
  toast.success("You're signed in! Have fun!", { timeout: 2000 })
  navigateTo('/')
}

const handleLoginError = () => {
  loggingIn.value = false
}

onBeforeMount(async () => {
  const { exit, signup } = useRoute().query
  if (exit || signup) {
    loggingIn.value = false
    return
  }
  if (await getCurrentUser()) {
    navigateTo('/')
  } else {
    const guest = await loginAsGuest('Player 1')
    if (guest) {
      await useProfile().getProfile(guest)
      navigateTo('/')
    } else {
      loggingIn.value = false
    }
  }
})
</script>

<style scoped>
#login-title {
  background: linear-gradient(15deg, gold, goldenrod, yellow);
  background-clip: text;
  color: transparent;
  font-family: 'Potta One', sans-serif;
  font-weight: 700;
  max-width: 500px;
  margin: 0 auto;
  z-index: 1;
}
.dark {
  &#login-title {
    background: linear-gradient(15deg, gold, palegoldenrod, lightgoldenrodyellow);
    background-clip: text;
    color: transparent;
    font-family: 'Potta One', sans-serif;
    font-weight: 700;
    max-width: 500px;
    margin: 0 auto;
    z-index: 1;
  }
}
</style>
