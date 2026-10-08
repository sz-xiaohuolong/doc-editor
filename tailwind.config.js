/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wolai: {
          sidebar: "#fbfbfa",
          hover: "#efefee",
          active: "#fde8e8",
          activeText: "#c53030",
          border: "#ececeb",
          text: "#37352f",
          muted: "#9b9a97",
        }
      }
    },
  },
  plugins: [],
}
