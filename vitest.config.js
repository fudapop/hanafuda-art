import { defineVitestConfig } from "nuxt-vitest/config";

export default defineVitestConfig({
  test: {
    globals: true,
    includeSource: ["{stores,utils,composables}/**/*.{js,ts}"],
  },
});
