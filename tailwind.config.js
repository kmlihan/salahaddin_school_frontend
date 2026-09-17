/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Site primary blends — accent injected via CSS variables (theme-aware).
      },
    },
  },
  plugins: [],
};
