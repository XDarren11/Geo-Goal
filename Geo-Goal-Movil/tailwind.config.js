/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'geo-green': '#39FF14',
        'geo-green-hover': '#2de00f',
        'geo-green-dim': 'rgba(57, 255, 20, 0.15)',
        'geo-black': '#0a0a0a',
      },
      fontFamily: {
        geo: ['Bebas Neue', 'Oswald', 'system-ui', 'sans-serif'],
        sans: ['Oswald', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}