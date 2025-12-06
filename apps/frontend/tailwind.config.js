/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FDFBF7', // Warm rice paper
        ink: '#2D3436',   // Soft charcoal
        jade: {
            50: '#F2F6F4',
            100: '#E1E9E4',
            200: '#C5D4CC',
            300: '#A4BDB0',
            400: '#84A695', // Main Jade
            500: '#678B79',
            600: '#506D5E',
            700: '#3D5247',
            800: '#2E3D35',
            900: '#222D27',
        },
        mist: '#E8F0F2',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', '"Times New Roman"', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mystic-gradient': 'linear-gradient(to top, #FDFBF7 0%, #E8F0F2 100%)',
      }
    },
  },
  plugins: [],
}
