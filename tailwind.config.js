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
        primary: 'hsl(var(--color-primary))',
        accent: 'hsl(var(--color-accent))',
        sakura: {
          DEFAULT: 'hsl(var(--color-sakura))',
          light: 'hsl(var(--color-sakura-light))',
          dark: 'hsl(var(--color-sakura-dark))',
        },
        // Natural, warm backgrounds
        background: 'hsl(var(--color-background))',
        surface: 'hsl(var(--color-surface))',
        border: 'hsl(var(--color-border))',
        text: {
          DEFAULT: 'hsl(var(--color-text))',
          secondary: 'hsl(var(--color-text-secondary))',
        },
        // Game-specific colors
        hanafuda: {
          red: 'hsl(var(--color-hanafuda-red))',
          gold: 'hsl(var(--color-hanafuda-gold))',
          cream: 'hsl(var(--color-hanafuda-cream))',
          brown: 'hsl(var(--color-hanafuda-brown))',
          purple: 'hsl(var(--color-hanafuda-purple))',
          green: 'hsl(var(--color-hanafuda-green))',
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
