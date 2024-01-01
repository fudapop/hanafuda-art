import { defineVitestConfig } from "nuxt-vitest/config";

export default defineVitestConfig({
  test: {
    globals: true,
    includeSource: ["{stores,utils,composables}/**/*.{js,ts}"],
    exclude: ["node_modules", "__checks__"],
  },
});
