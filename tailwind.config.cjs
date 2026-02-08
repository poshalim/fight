/**** Tailwind config ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nekoglai: '#4f46e5',
        mafanya: '#ef4444',
        polina: '#10b981'
      }
    },
  },
  plugins: [],
}
