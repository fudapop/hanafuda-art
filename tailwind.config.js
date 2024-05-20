/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [],
  darkMode: ["selector", ".dark"],
  theme: {
    extend: {},
    screens: {
      xs: "420px",
      ...defaultTheme.screens,
    },
  },
  plugins: [
    require("@tailwindcss/container-queries"),
    require("@tailwindcss/forms"),
    require("@headlessui/tailwindcss")({ prefix: "ui" }),
  ],
};
