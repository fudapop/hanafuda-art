// https://nuxt.com/docs/api/configuration/nuxt-config
const NODE_ENV = process.env.NUXT_NODE_ENV ?? 'development';
console.log(NODE_ENV);
export default defineNuxtConfig({
  css: [
    "@/assets/css/card-styles.css",
  ],
  devtools: { enabled: true },
  image: {
    cloudinary: {
      baseURL: "https://res.cloudinary.com/dap2o5kiu/image/upload",
    },
  },
  modules: [
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
    "nuxt-icon",
    "nuxt-headlessui",
    "@nuxt/image",
    "nuxt-vitest",
    "nuxt-vuefire",
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    nodeEnv: NODE_ENV,
  },
  ssr: false,
  tailwindcss: {
    viewer: false,
  },
  vuefire: {
    auth: true,
    config: {
      apiKey: 'AIzaSyBd-cAa_MlXodRUxNXJJsPc0uLz6FjdK18',
      authDomain: 'new-hanafuda.firebaseapp.com',
      projectId: 'new-hanafuda',
      storageBucket: "new-hanafuda.appspot.com",
      messagingSenderId: "938327095699",
      appId: "1:938327095699:web:b79f95821825d93b295066",
      measurementId: "G-RDPJ7SKMBT",
    },
  }
});
