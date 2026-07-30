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
          900: '#0d4330',
          950: '#06371f'
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
          DEFAULT: '#0b1220',
          soft: '#334155',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      fontSize: {
        // tighter, more editorial display sizes
        'display-sm': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        display: ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-lg': ['4.25rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'display-xl': ['5.5rem', { lineHeight: '0.98', letterSpacing: '-0.035em' }]
      },
      letterSpacing: { tightest: '-0.04em' },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem', '4xl': '2.25rem' },
      maxWidth: { '7xl': '80rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)',
        lift: '0 20px 48px -24px rgba(15,23,42,0.28)',
        glow: '0 24px 60px -20px rgba(21,132,85,0.45)'
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'orb-a': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(40px,-30px) scale(1.12)' } },
        'orb-b': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-36px,28px) scale(1.1)' } },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        'pulse-ring': { '0%': { transform: 'scale(0.9)', opacity: 0.6 }, '100%': { transform: 'scale(1.6)', opacity: 0 } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        indeterminate: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(340%)' } }
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.9s ease both',
        float: 'float 5.5s ease-in-out infinite',
        'orb-a': 'orb-a 18s ease-in-out infinite',
        'orb-b': 'orb-b 22s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        marquee: 'marquee 30s linear infinite',
        indeterminate: 'indeterminate 1.3s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
