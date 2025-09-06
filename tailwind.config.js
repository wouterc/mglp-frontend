// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}", // Tilføjet
    "./src/pages/**/*.{js,ts,jsx,tsx}",      // Tilføjet
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
