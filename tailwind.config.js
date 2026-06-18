/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'iut-noir': '#111111',
        'iut-rouge': '#C8102E',      // Le fameux rouge de la charte
        'iut-rougeHover': '#A00D25',
        'iut-carte': '#1A1A1A',
        'iut-carteBrute': '#161616',
        'iut-bordure': '#333333',
        'iut-bordureFine': '#222222',
        'iut-bordureCarte': '#2A2A2A',
        'iut-gris': '#CCCCCC',
        'iut-grisIntermediaire': '#999999',
        'iut-grisFonce': '#666666',
        'iut-vert': '#00B074',
        'iut-lime': '#84CC16',
        'iut-jaune': '#EAB308',
      },
      opacity: {
        '8': '0.08',
        '12': '0.12',
        '15': '0.15',
      },
    },
  },
  plugins: [],
}