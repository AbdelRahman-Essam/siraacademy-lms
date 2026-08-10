/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sira English identity: navy from the seal, warm parchment paper,
        // and a brass accent echoing the laurel wreath's foil-stamp feel.
        brand: {
          DEFAULT: '#16304F',
          light: '#2A4A73',
          dark: '#0D1E33',
        },
        parchment: {
          DEFAULT: '#F8F3E8',
          dark: '#EFE7D4',
        },
        brass: {
          DEFAULT: '#A8823E',
          light: '#C6A15E',
          dark: '#7C5F2C',
        },
        ink: '#1C2230',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
