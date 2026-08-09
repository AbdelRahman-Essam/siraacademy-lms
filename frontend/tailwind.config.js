/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#16304F', // Sira English navy
          light: '#2A4A73',
          dark: '#0D1E33',
        },
      },
    },
  },
  plugins: [],
}
