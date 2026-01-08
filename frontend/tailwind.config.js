/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052D9',
          light: '#0066FF',
          lighter: '#3388FF',
        },
        dark: {
          bg: '#1D1D1D',
          card: '#2A2A2A',
          border: '#363636',
        },
        success: '#00A870',
        warning: '#ED7B2F',
        error: '#E34D59',
      },
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
