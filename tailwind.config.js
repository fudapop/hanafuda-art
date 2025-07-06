/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  darkMode: ['selector', '.dark'],
  theme: {
    extend: {
      colors: {
        // Hanafuda-inspired palette using CSS variables
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        sakura: {
          DEFAULT: 'var(--color-sakura)',
          light: 'var(--color-sakura-light)',
          dark: 'var(--color-sakura-dark)',
        },
        // Natural, warm backgrounds
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
        },
        // Game-specific colors
        hanafuda: {
          red: 'var(--color-hanafuda-red)',
          gold: 'var(--color-hanafuda-gold)',
          cream: 'var(--color-hanafuda-cream)',
          brown: 'var(--color-hanafuda-brown)',
          purple: 'var(--color-hanafuda-purple)',
          green: 'var(--color-hanafuda-green)',
        },
      },
    },
    screens: {
      xs: '420px',
      ...defaultTheme.screens,
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@headlessui/tailwindcss')({ prefix: 'ui' }),
  ],
}
