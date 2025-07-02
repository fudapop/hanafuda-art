import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    globals: true,
    setupFiles: ["./test-setup.ts"],
    includeSource: ["**/__tests__/**/*.{js,ts}"],
    exclude: ["node_modules", "__checks__"],
    environmentOptions: {
      nuxt: {
        mock: {
          intersectionObserver: true,
          indexedDb: true,
        },
      },
    },
  },
});
