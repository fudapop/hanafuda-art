import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    globals: true,
    setupFiles: ['./test-setup.ts'],
    includeSource: ['**/__tests__/**/*.{js,ts}'],
    exclude: ['**/node_modules', '__checks__', '**/firestore.rules.test.ts'],
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        // Tests must not inherit developer credentials from dotenv files.
        dotenv: { fileName: '/dev/null' },
        mock: {
          intersectionObserver: true,
          indexedDb: true,
        },
      },
    },
  },
})
