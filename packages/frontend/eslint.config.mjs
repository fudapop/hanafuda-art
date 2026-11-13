// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

// Stylistic rules stay off in nuxt.config. Prettier is last so Vue formatting
// rules that disagree with .prettierrc (attribute layout, quotes) are disabled.
export default withNuxt(
  {
    rules: {
      // Formatting-adjacent. `--fix` would reshuffle existing templates.
      'vue/attributes-order': 'off',
      'vue/attribute-hyphenation': 'off',
      // Many props are required with no default on purpose.
      'vue/require-default-prop': 'off',
      // Single-word component names already exist (for example Shout.vue).
      'vue/multi-word-component-names': 'off',
      // The codebase already uses `any` at Firebase and test boundaries.
      // `pnpm typecheck` is the strictness gate; this rule would be a separate cleanup.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
    },
  },
  eslintConfigPrettier,
)
