// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
const seoMeta = JSON.parse(readFileSync(resolve('./seo-meta.json'), 'utf-8'))
const localization = JSON.parse(readFileSync(resolve('./localization.json'), 'utf-8'))

const headScripts = []

// Apply color mode synchronously before render (critical for PWA)
// Read from separate file for better maintainability
const colorModeInitScript = readFileSync(resolve('./scripts/color-mode-init.js'), 'utf-8')
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
  })
}

const bucketUrl = process.env.NUXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/static'

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
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
          href: process.env.NUXT_PUBLIC_SUPABASE_URL,
        },
        {
          rel: 'preconnect',
          href: process.env.NUXT_PUBLIC_SUPABASE_URL,
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
  i18n: {
    autoDeclare: true,
    baseUrl: 'https://newhanafuda.art',
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
    devOptions: {
      enabled: true,
      type: 'module',
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
    workbox: {
      globPatterns: ['**/*.{js,css,html,webp,png}'],
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 4,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.supabase\.(?:co|io)\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'supabase-cache', // images and audio
            expiration: {
              maxEntries: 1000,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
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
      include: ['class-variance-authority', 'reka-ui', 'lucide-vue-next', 'clsx', 'tailwind-merge'],
      exclude: ['better-sqlite3'],
    },
    plugins: [tailwindcss()],
  },
  vuefire: {
    auth: true,
    appCheck: {
      debug: process.env.APPCHECK_DEBUG_TOKEN,
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
    },
  },
})
