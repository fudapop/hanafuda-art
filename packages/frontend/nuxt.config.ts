// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'path'
import type { NuxtConfig } from 'nuxt/schema'
import { appCheckDebugToken } from './app/utils/appCheckDebug'
import { ASSET_ORIGIN } from './app/utils/assetUrls'
import { assetWorker, workboxOptions } from './build/pwa'

// Nuxt schema inlines Vite's UserConfig, so it does not see Vite's Rollup
// module augmentation (`viteVersion` on PluginContextMeta). @tailwindcss/vite
// still returns a Vite 7.3.1 plugin; the mismatch is type identity only.
type VitePlugin = NonNullable<NonNullable<NuxtConfig['vite']>['plugins']>[number]
const tailwindVitePlugin = tailwindcss() as unknown as VitePlugin

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://newhanafuda.art'
const siteDomain = new URL(siteUrl).hostname

const seoMeta = JSON.parse(
  readFileSync(resolve('./seo-meta.json'), 'utf-8')
    .replaceAll('__SITE_URL__', siteUrl)
    .replaceAll('__SITE_DOMAIN__', siteDomain)
    .replaceAll('__ASSET_ORIGIN__', ASSET_ORIGIN),
)
const localization = JSON.parse(readFileSync(resolve('./localization.json'), 'utf-8'))

const headScripts = []

// Apply color mode synchronously before render (critical for PWA)
// Read from separate file for better maintainability
const colorModeInitScript = readFileSync(resolve('../../scripts/color-mode-init.js'), 'utf-8')
headScripts.push({
  innerHTML: colorModeInitScript,
  type: 'text/javascript',
})

const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) {
  headScripts.push({
    id: 'cookieyes',
    type: 'text/javascript',
    src: 'https://cdn-cookieyes.com/client_data/0d8331e0442d66223912def6/script.js',
    defer: true,
  })
}

export default defineNuxtConfig({
  hooks: {
    async 'nitro:config'(config) {
      // Nitro publishes root assets; Vite's client output only publishes _nuxt.
      // Keep this generated companion content-addressed and available to sw.js.
      const directory = resolve(config.rootDir ?? '.', '.cache/r2-worker', assetWorker.fileName)
      await mkdir(directory, { recursive: true })
      await writeFile(resolve(directory, assetWorker.fileName), assetWorker.source)
      config.publicAssets ??= []
      config.publicAssets.push({ dir: directory, baseURL: '/', maxAge: 0 })
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      // viewport-fit=cover lets env(safe-area-inset-*) resolve on notched iPhones
      // and in standalone PWA display. Do not lock zoom — accessibility text and
      // pinch-zoom must keep working.
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      link: [
        {
          rel: 'icon',
          href: '/icons/icon_64x64.png',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'preload',
          as: 'style',
          href: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;700&display=swap',
          onload: "this.rel = 'stylesheet'",
        },
        {
          rel: 'dns-prefetch',
          href: ASSET_ORIGIN,
        },
        {
          rel: 'preconnect',
          href: ASSET_ORIGIN,
        },
        {
          rel: 'preload',
          as: 'style',
          href: 'https://fonts.googleapis.com/css2?family=Potta+One&display=swap',
          onload: "this.rel = 'stylesheet'",
        },
      ],
      meta: seoMeta,
      script: headScripts,
      title: 'New Hanafuda | Play Hanafuda Koi-Koi',
    },
  },
  compatibilityDate: '2025-07-18',
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/buttons',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/cards',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/modal',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/menu',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/play-area',
      pathPrefix: false,
      extensions: ['.vue'],
    },
    {
      path: '~/components/side-panel',
      pathPrefix: false,
      extensions: ['.vue'],
    },
  ],
  css: ['~/assets/css/card-styles.css', '~/assets/css/global.css'],
  devServer: {
    port: 8888,
  },
  devtools: { enabled: true, vueDevTools: true },
  eslint: {
    // Prettier owns formatting. The checker stays off so dev and build do not
    // start linting; `pnpm lint` is the gate.
    checker: false,
    config: {
      stylistic: false,
    },
  },
  i18n: {
    autoDeclare: true,
    baseUrl: siteUrl,
    defaultLocale: localization.defaultLocale,
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true,
      fallbackLocale: localization.defaultLocale,
    },
    langDir: 'locales/',
    locales: localization.locales,
    strategy: 'prefix_and_default',
  },
  icon: {
    provider: 'none',
    clientBundle: {
      scan: true,
    },
  },
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'nuxt-headlessui',
    '@nuxt/image',
    '@nuxt/test-utils/module',
    'nuxt-vuefire',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxtjs/device',
    'nuxt-posthog',
    'shadcn-nuxt',
    'nuxt-charts',
    '@vite-pwa/nuxt',
    '@nuxt/icon',
  ],
  posthog: {
    disabled: !isProduction,
    proxy: !isProduction,
    clientOptions: {
      autocapture: true,
      persistence: 'localStorage+cookie',
    },
  },
  pwa: {
    // Prompt mode keeps the new worker waiting. autoUpdate reloads every open
    // window as soon as that worker activates, including a live match.
    // useAppUpdate posts SKIP_WAITING only when the player is off the board.
    registerType: 'prompt',
    injectRegister: false,
    registerWebManifestInRouteRules: true,
    client: {
      // The module client reloads on the worker's controlling event. This app
      // registers the worker itself so a match can finish first.
      registerPlugin: false,
    },
    devOptions: {
      enabled: true,
      // generateSW serves the dev worker as a classic script.
      type: 'classic',
    },
    manifest: {
      id: 'com.fudapop.koikoi',
      name: 'Hanafuda Koi-Koi',
      short_name: 'Hanafuda Koi-Koi',
      categories: ['games'],
      description: 'Play Hanafuda Koi-Koi',
      display_override: ['fullscreen', 'window-controls-overlay', 'minimal-ui'],
      display: 'standalone',
      orientation: 'natural',
      background_color: 'rgb(255 250 240)',
      icons: [
        {
          src: 'icons/icon_64x64.png',
          sizes: '64x64',
          type: 'image/png',
        },
        {
          src: 'icons/icon_92x92.png',
          sizes: '92x92',
          type: 'image/png',
        },
        {
          src: 'icons/icon_144x144.png',
          sizes: '144x144',
          type: 'image/png',
        },
        {
          src: 'icons/icon_512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      screenshots: [
        {
          src: 'screenshots/desktop-game-in-progress.webp',
          sizes: '1280x720',
          form_factor: 'wide',
          label: 'Desktop view during gameplay in dark mode',
        },
        {
          src: 'screenshots/mobile-menu-open.webp',
          sizes: '750x1540',
          form_factor: 'narrow',
          label: 'Mobile view with menu open to deck selection in light mode',
        },
        {
          src: 'screenshots/mobile-menu-open.webp',
          sizes: '750x1540',
          form_factor: 'narrow',
          label: 'Mobile view during gameplay in dark mode',
        },
      ],
    },
    workbox: workboxOptions,
  },
  router: {
    options: {
      scrollBehaviorType: 'auto',
    },
  },
  runtimeConfig: {
    public: {
      nodeEnv: process.env.NODE_ENV,
      version: pkg.version,
      siteUrl,
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      saveIntegritySalt: process.env.NUXT_PUBLIC_SAVE_INTEGRITY_SALT,
    },
    private: {
      supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    },
  },
  shadcn: {
    prefix: 'ui',
  },
  ssr: false,
  vite: {
    optimizeDeps: {
      include: ['class-variance-authority', 'reka-ui', 'lucide-vue-next', 'clsx', 'tailwind-merge', 'striptags'],
      exclude: ['better-sqlite3'],
    },
    plugins: [tailwindVitePlugin],
  },
  vuefire: {
    auth: true,
    appCheck: {
      // VueFire copies this value into public runtime config. Only a dev build
      // may receive the token; production must get false so the bundle cannot ship it.
      debug: appCheckDebugToken(process.env.NODE_ENV, process.env.APPCHECK_DEBUG_TOKEN),
      isTokenAutoRefreshEnabled: true,
      provider: 'ReCaptchaV3',
      key: process.env.RECAPTCHA_KEY!,
    },
    config: {
      apiKey: process.env.API_KEY,
      authDomain: 'new-hanafuda.firebaseapp.com',
      projectId: 'new-hanafuda',
      storageBucket: 'new-hanafuda.appspot.com',
      messagingSenderId: '938327095699',
      appId: '1:938327095699:web:b79f95821825d93b295066',
      measurementId: 'G-RDPJ7SKMBT',
      databaseURL: 'https://new-hanafuda-default-rtdb.firebaseio.com',
    },
  },
})
