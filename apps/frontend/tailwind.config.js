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
        arcane: {
          50: '#F8F5FF',   // Pale mystical white
          100: '#EDE8FF',  // Soft lavender mist
          200: '#D9CCFF',  // Light amethyst
          300: '#B8A3FF',  // Medium violet
          400: '#9575CD',  // Main arcane purple
          500: '#7E57C2',  // Deep violet
          600: '#673AB7',  // Rich purple
          700: '#512DA8',  // Dark mystic
          800: '#311B92',  // Deep indigo
          900: '#1A0A47',  // Midnight purple
        },
        gold: {
          300: '#FFE082',  // Light gold
          400: '#FFD54F',  // Warm gold
          500: '#FFCA28',  // Rich gold
          600: '#D4A537',  // Antique gold
          700: '#8D6E1F',  // Dark gold
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
