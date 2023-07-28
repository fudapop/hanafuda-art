// https://nuxt.com/docs/api/configuration/nuxt-config
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
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  tailwindcss: {
    viewer: false,
  },
});
