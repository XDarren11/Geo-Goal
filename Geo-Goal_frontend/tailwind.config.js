/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        geo: ['Bebas Neue', 'Oswald', 'system-ui', 'sans-serif'],
        sans: ['Oswald', 'system-ui', 'sans-serif'],
      },
      colors: {
        'geo-green': {
          DEFAULT: '#39FF14',
          hover: '#2de00f',
          dim: 'rgba(57, 255, 20, 0.15)',
        },
        'geo-black': '#0a0a0a',
      },
      backgroundImage: {
        'pitch-stripes': 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(57, 255, 20, 0.12) 40px, rgba(57, 255, 20, 0.12) 41px)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
