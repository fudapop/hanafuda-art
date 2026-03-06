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
          src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/logo-title.webp"
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
              @error="handleLoginError"
              class="mb-4"
            />

            <OAuthLoginForm
              @success="handleLoginSuccess"
              @error="handleLoginError"
            />

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
import { toast } from 'vue-sonner'

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

const { current: currentUser } = useProfile()
const loggingIn = ref<boolean>(true)

const { $clientPosthog } = useNuxtApp()

const identifyUser = () => {
  if (!currentUser.value) return
  $clientPosthog?.identify(currentUser.value.uid, {
    username: currentUser.value.username,
    locale: locale.value,
    lastLogin: currentUser.value.lastUpdated,
    gamesPlayed:
      currentUser.value.record.win + currentUser.value.record.loss + currentUser.value.record.draw,
  })
}

const handleLoginSuccess = () => {
  loggingIn.value = true
  toast.success(t('auth.messages.youreSignedIn'), { duration: 2000 })
  identifyUser()
  navigateTo(localeRoute('/'))
}

const handleLoginError = () => {
  loggingIn.value = false
}

onMounted(async () => {
  const { exit, signup } = useRoute().query
  if (exit || signup) {
    loggingIn.value = false
    return
  }
  const { getCurrentUser } = await import('vuefire')
  if (await getCurrentUser()) {
    identifyUser()
    navigateTo(localeRoute('/'))
  } else {
    // No authenticated user - guest profile will be auto-created by app
    loggingIn.value = false
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
