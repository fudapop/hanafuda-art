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
          :alt="t('game.title')"
        />
        <h1 class="sr-only">{{ t('game.title') }}</h1>
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
            {{ t('common.labels.justAMoment') }}
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
          <div class="max-w-md mx-auto min-w-[300px] pt-8 w-full space-y-8">
            <EmailLoginForm
              @success="handleLoginSuccess"
              @linked="handleLinked"
              @error="handleLoginError"
              class="mb-4"
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
                :to="localeRoute('/')"
                class="text-text-secondary hover:underline hover:text-primary"
              >
                {{ t('navigation.continueAsGuest') }}
              </NuxtLink>
            </div>

            <!-- Legal Links -->
            <div class="w-full space-x-2 text-xs text-center text-text-secondary">
              <NuxtLink
                :to="localeRoute('/terms')"
                class="hover:text-text-secondary/80"
              >
                {{ t('footer.links.termsOfUse') }}
              </NuxtLink>
              <span class="text-text-secondary/80">•</span>
              <NuxtLink
                :to="localeRoute('/privacy')"
                class="hover:text-text-secondary/80"
              >
                {{ t('footer.links.privacyPolicy') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </ContentLayout>
</template>
<script setup lang="ts">
import { useToast } from 'vue-toastification'

const { t, locale } = useI18n()
const pageTitle = computed(() => `${t('game.title')} | ${t('pages.signIn')}`)
const pageDescription = computed(() => t('pageDescriptions.signIn', { appName: t('game.title') }))

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
})

const localeRoute = useLocaleRoute()

const { isMobile } = useDevice()

const { loginAsGuest } = useAuth()
const { upgradeGuestProfile, current: currentUser } = useProfile()
const toast = useToast()
const loggingIn = ref<boolean>(true)

const { $clientPosthog } = useNuxtApp()

const identifyUser = () => {
  $clientPosthog?.identify(currentUser.value!.uid, {
    username: currentUser.value!.username,
    locale: locale.value,
    lastLogin: currentUser.value!.lastUpdated,
    gamesPlayed:
      currentUser.value!.record.win +
      currentUser.value!.record.loss +
      currentUser.value!.record.draw,
  })
}

const handleLinked = () => {
  if (!currentUser.value) {
    toast.error(t('auth.messages.failedToLinkAccount'), { timeout: 8000 })
    return
  }
  loggingIn.value = true
  toast.success(t('auth.messages.accountLinked'), {
    timeout: 8000,
  })
  upgradeGuestProfile(currentUser.value!)
  identifyUser()
  navigateTo(localeRoute('/'))
}

const handleLoginSuccess = () => {
  loggingIn.value = true
  toast.success(t('auth.messages.youreSignedIn'), { timeout: 2000 })
  identifyUser()
  navigateTo(localeRoute('/'))
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
    identifyUser()
    navigateTo(localeRoute('/'))
  } else {
    const guest = await loginAsGuest('Player 1')
    if (guest) {
      await useProfile().getProfile(guest)
      identifyUser()
      navigateTo(localeRoute('/'))
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
