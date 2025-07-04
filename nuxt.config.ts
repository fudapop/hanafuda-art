// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
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
  devtools: { enabled: false },
  app: {
    head: {
      bodyAttrs: {
        class: 'dark:bg-gray-800',
      },
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        {
          rel: 'icon',
          href: '/sakura.png',
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
          href: 'https://fonts.googleapis.com/css2?family=Potta+One&display=swap',
          onload: "this.rel = 'stylesheet'",
        },
        {
          rel: 'preload',
          as: 'style',
          href: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;700&display=swap',
          onload: "this.rel = 'stylesheet'",
        },
      ],
      script: [
        {
          id: 'cookieyes',
          type: 'text/partytown',
          src: 'https://cdn-cookieyes.com/client_data/0d8331e0442d66223912def6/script.js',
        },
      ],
      title: 'New Hanafuda',
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  image: {
    cloudinary: {
      baseURL: 'https://res.cloudinary.com/dap2o5kiu/image/upload',
    },
  },
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
  modules: [
    '@pinia/nuxt',
    'nuxt-icon',
    'nuxt-headlessui',
    '@nuxt/image',
    '@nuxt/test-utils/module',
    'nuxt-vuefire',
    '@nuxtjs/partytown',
    '@nuxtjs/i18n',
  ],
  postcss: {
    plugins: {
      'tailwindcss/nesting': {},
      'tailwindcss': {},
      'autoprefixer': {},
    },
  },
  routeRules: {
    // Set custom headers matching paths
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, maxage=86400, stale-while-revalidate=86400',
      },
    },
    '/(_ipx|cards|images|bg|avatars)/**': {
      headers: {
        'Cache-Control':
          'public, maxage=604800, stale-while-revalidate=86400, stale-if-error=86400',
      },
    },
  },
  runtimeConfig: {
    public: {
      nodeEnv: process.env.NODE_ENV,
      version: pkg.version,
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
