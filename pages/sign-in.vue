<template>
  <ContentLayout>
    <div class="overflow-hidden isolate">
      <div
        v-if="!loggingIn"
        :class="[
          'flex justify-center drop-shadow-xl my-12 w-full',
          'landscape:w-1/2 landscape:h-screen landscape:items-center landscape:my-auto',
        ]"
      >
        <img
          src="/images/logo-title.webp"
          class="landscape:max-h-[20vw] max-h-[120px] h-[40vh]"
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
          :class="[
            'absolute px-4 py-8 overflow-hidden rounded-md shadow-lg -z-10 bg-white dark:bg-hanafuda-cream w-max h-max',
            'landscape:h-screen landscape:top-0 landscape:right-0 landscape:w-1/2 landscape:max-w-none landscape:overflow-y-auto',
            !isMobile && 'landscape:flex landscape:items-center',
            'portrait:bottom-1/4 portrait:inset-x-0 portrait:top-32 portrait:w-screen',
          ]"
        >
          <div class="max-w-md mx-auto min-w-[300px] pt-8 w-full">
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

            <div class="w-full my-8 text-sm text-center">
              <NuxtLink
                :external="!currentUser"
                to="/"
                class="text-text-secondary hover:underline hover:text-primary"
              >
                Continue as guest
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
      </Transition>
    </div>
  </ContentLayout>
</template>
<script setup lang="ts">
import { useScreenOrientation } from '@vueuse/core'
import { useToast } from 'vue-toastification'

definePageMeta({
  title: 'New Hanafuda | Sign In',
})

const { isMobile } = useDevice()
const { orientation } = useScreenOrientation()
const isLandscape = computed(() => orientation.value?.includes('landscape'))

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
