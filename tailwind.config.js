/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#060E18',
          800: '#0B1929',
          700: '#0F2440',
          600: '#1A3356',
          500: '#24456E',
        },
        teal: {
          500: '#00C9B1',
          400: '#2DD4BF',
          300: '#5EEAD4',
        },
        coral: { DEFAULT: '#FF6B6B' },
        amber: { DEFAULT: '#F59E0B' },
      },
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
        mono: ['Montserrat', 'monospace'],
      },
    },
  },
  plugins: [],
}
