/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
      },
      colors: {
        nes: {
          red: "#e60012",
          bg: "#1a1a1a",
        },
        switch: {
          bg: "#2b2b2b",
        }
      },
      blur: {
        '3xl': '64px',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.perspective-1000': {
          'perspective': '1000px',
        },
        '.transform-style-3d': {
          'transform-style': 'preserve-3d',
        },
      })
    }
  ],
}