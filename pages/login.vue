<template>
  <ContentLayout>
    <div class="isolate">
      <div
        v-if="!loggingIn"
        class="flex justify-center my-12 drop-shadow-xl"
      >
        <img
          src="~/assets/images/logo-title.png"
          class="w-[100px] mb-2"
          alt="Hanafuda Koi-Koi"
        />
        <h1 class="sr-only">Hanafuda Koi-Koi</h1>
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
          class="absolute inset-0 px-4 py-8 m-auto overflow-hidden rounded-sm shadow-lg -z-10 bg-white/90 dark:bg-hanafuda-cream w-max h-max sm:px-6 lg:px-20 xl:px-24"
        >
          <div class="max-w-sm mx-auto min-w-[300px] w-[90vw] lg:w-96">
            <div class="pt-8 space-y-4">
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
                  class="text-text-secondary hover:underline hover:text-primary"
                >
                  Continue as guest &rarr;
                </NuxtLink>
              </div>

              <!-- Legal Links -->
              <div class="w-full space-x-4 text-xs text-center text-text-secondary">
                <NuxtLink
                  to="/terms"
                  class="underline hover:text-text-secondary/80"
                >
                  Terms of Use
                </NuxtLink>
                <NuxtLink
                  to="/privacy"
                  class="underline hover:text-text-secondary/80"
                >
                  Privacy Policy
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </ContentLayout>
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
