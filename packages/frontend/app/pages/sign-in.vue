<template>
  <ContentLayout>
    <!--
      The panel is stretched with top/bottom and has no height of its own, so this
      box has to be the viewport. A logo-height wrapper with overflow:hidden became
      the containing block in Safari and clipped the form under the email field.
      flow-root keeps the logo's top margin inside this box; without it the margin
      collapses through and the panel hangs below the viewport.
      The split layout uses wide-landscape (landscape and at least 480px wide).
      Plain landscape: matches a portrait phone once the iOS keyboard shrinks
      the visual viewport, which put the form beside the logo.
    -->
    <div
      data-sign-in-shell
      class="relative isolate flow-root h-dvh"
    >
      <div
        v-if="!loggingIn"
        data-sign-in-logo
        :class="[
          'relative z-10 flex justify-center drop-shadow-xl my-12 w-full',
          'wide-landscape:w-1/2 wide-landscape:h-full wide-landscape:items-center wide-landscape:my-0',
        ]"
      >
        <img
          src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/logo-title.webp"
          class="wide-landscape:max-h-[20vw] max-h-[120px] h-[40vh]"
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
            'absolute z-0 px-4 py-8 overflow-x-hidden overflow-y-auto rounded-md shadow-lg bg-white dark:bg-hanafuda-cream box-border w-full max-w-full min-w-0',
            'inset-x-0 top-32 bottom-0',
            'wide-landscape:inset-y-0 wide-landscape:left-auto wide-landscape:right-0 wide-landscape:top-0 wide-landscape:bottom-0 wide-landscape:h-auto wide-landscape:w-1/2',
            !isMobile && 'wide-landscape:flex wide-landscape:items-center',
          ]"
          data-sign-in-panel
        >
          <div class="max-w-md mx-auto min-w-0 pt-4 w-full space-y-8">
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
