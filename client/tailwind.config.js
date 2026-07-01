/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        felt: "#1a472a",
        feltLight: "#2d6a4f",
        feltDark: "#0f2d1c",
        cardWhite: "#f8f4e8",
        cardShadow: "#c8b89a",
        bust: "#dc2626",
        gold: "#f59e0b",
        freeze: "#3b82f6",
        flipthree: "#8b5cf6",
        secondchance: "#10b981",
      },
    },
  },
  plugins: [],
};
