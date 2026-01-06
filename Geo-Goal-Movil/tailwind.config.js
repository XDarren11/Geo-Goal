/** @type {import('tailwindcss').Config} */
module.exports = {
  // Aquí indicamos dónde vamos a usar las clases de tailwind
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        geogreen: '0ED000'
      }
    },
  },
  plugins: [],
}