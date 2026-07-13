/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf3',
          100: '#d6f5e1',
          200: '#afe9c7',
          300: '#7bd8a8',
          400: '#45bf85',
          500: '#22a56a',
          600: '#158455',
          700: '#116846',
          800: '#0f5238',
          900: '#0d4330'
        },
        accent: {
          50: '#fff8ec',
          100: '#ffedc9',
          200: '#ffd88c',
          300: '#ffbe4f',
          400: '#ffa524',
          500: '#f8850a',
          600: '#dc6405',
          700: '#b64708',
          800: '#93390d',
          900: '#78300e'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: []
}
