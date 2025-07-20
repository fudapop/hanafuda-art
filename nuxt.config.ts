// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
const seoMeta = JSON.parse(readFileSync(resolve('./seo-meta.json'), 'utf-8'))

const headScripts = []

if (process.env.NODE_ENV === 'production') {
  headScripts.push({
    id: 'cookieyes',
    type: 'text/javascript',
    src: 'https://cdn-cookieyes.com/client_data/0d8331e0442d66223912def6/script.js',
  })
}

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        {
          rel: 'icon',
          href: '/images/sakura.png',
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
      ],
      meta: seoMeta,
      script: headScripts,
      title: 'New Hanafuda | Play Hanafuda Koi-Koi',
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  compatibilityDate: '2025-07-18',
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
    {
      path: '~/components/buttons',
      pathPrefix: false,
    },
    {
      path: '~/components/cards',
      pathPrefix: false,
    },
    {
      path: '~/components/modal',
      pathPrefix: false,
    },
    {
      path: '~/components/menu',
      pathPrefix: false,
    },
    {
      path: '~/components/play-area',
      pathPrefix: false,
    },
    {
      path: '~/components/side-panel',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/card-styles.css', '~/assets/css/global.css'],
  devServer: {
    port: 8888,
  },
  devtools: { enabled: false },
  i18n: {
    autoDeclare: true,
    baseUrl: 'https://newhanafuda.art',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true,
      fallbackLocale: 'en',
    },
    langDir: 'locales/',
    locales: [
      {
        name: 'English',
        code: 'en',
        language: 'en-US',
        file: 'en-us.json',
        dir: 'ltr',
      },
      {
        name: '日本語',
        code: 'ja',
        language: 'ja-JP',
        file: 'ja-jp.json',
        dir: 'ltr',
      },
    ],
    strategy: 'prefix_and_default',
  },
  modules: [
    '@pinia/nuxt',
    'nuxt-icon',
    'nuxt-headlessui',
    '@nuxt/image',
    '@nuxt/test-utils/module',
    'nuxt-vuefire',
    '@nuxtjs/i18n',
    '@nuxt/content',
    '@nuxtjs/device',
  ],
  postcss: {
    plugins: {
      'tailwindcss/nesting': {},
      'tailwindcss': {},
      'autoprefixer': {},
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
    },
    private: {
      supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    },
  },
  ssr: false,
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
  vite: {
    optimizeDeps: {
      force: true,
    },
  },
})
