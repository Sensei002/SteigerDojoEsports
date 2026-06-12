/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // SteigerDojoEsports brand palette
        brand: {
          black: '#0a0a0c',
          dark: '#121216',
          panel: '#1a1a20',
          border: '#2a2a33',
          gray: '#8a8a99',
          light: '#e6e6ec',
          red: '#e11d2a',
          redDark: '#b3151f',
          redGlow: '#ff2e3d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Rajdhani"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(225, 29, 42, 0.35)',
        card: '0 8px 30px rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
