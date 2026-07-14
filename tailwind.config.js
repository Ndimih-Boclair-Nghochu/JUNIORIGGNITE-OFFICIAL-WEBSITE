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
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#334155',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      maxWidth: { '7xl': '80rem' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'orb-a': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(40px,-30px) scale(1.12)' } },
        'orb-b': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-36px,28px) scale(1.1)' } }
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 5.5s ease-in-out infinite',
        'orb-a': 'orb-a 18s ease-in-out infinite',
        'orb-b': 'orb-b 22s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
