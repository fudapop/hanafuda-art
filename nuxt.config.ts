// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
const seoMeta = JSON.parse(readFileSync(resolve('./seo-meta.json'), 'utf-8'))
const localization = JSON.parse(readFileSync(resolve('./localization.json'), 'utf-8'))

const headScripts = []

// Apply color mode synchronously before render
// Read from separate file for better maintainability
const colorModeInitScript = readFileSync(resolve('./scripts/color-mode-init.js'), 'utf-8')
headScripts.push({
  innerHTML: colorModeInitScript,
  type: 'text/javascript',
})

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
    port: 8088,
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
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxtjs/device',
    'shadcn-nuxt',
    'nuxt-charts',
    '@nuxt/icon',
  ],
  router: {
    options: {
      scrollBehaviorType: 'auto',
    },
  },
  runtimeConfig: {
    public: {
      version: pkg.version,
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
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
})
