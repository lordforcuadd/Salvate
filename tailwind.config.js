/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
          400: '#34d399',
        },
        sky: {
          600: '#0284c7',
          500: '#0ea5e9',
          400: '#38bdf8',
        },
        terracotta: {
          500: '#f43f5e',
          600: '#e11d48',
          400: '#fb7185',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        'touch': '56px',
      }
    },
  },
  plugins: [],
}
