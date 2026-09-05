/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d9e2',
          300: '#aeb7c8',
          400: '#8290a9',
          500: '#61708d',
          600: '#4c5974',
          700: '#3e485e',
          800: '#353d4f',
          900: '#0f1729',
        },
        brand: {
          50: '#eef4ff',
          100: '#dae5ff',
          200: '#bdd1ff',
          400: '#6b8dff',
          500: '#4361ee',
          600: '#2f47d4',
          700: '#2637a8',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,41,0.04), 0 8px 24px -12px rgba(15,23,41,0.12)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { rise: 'rise .25s ease-out both' },
    },
  },
  plugins: [],
}
