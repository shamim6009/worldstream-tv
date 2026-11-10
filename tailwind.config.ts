import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080D1B',
          900: '#0C1424',
          850: '#111A2E',
          800: '#172238',
          700: '#1F2D47',
          600: '#2B3B59',
        },
        accent: {
          DEFAULT: '#2563EB',
          soft: '#3B82F6',
          cyan: '#06B6D4',
        },
        muted: '#94A3B8',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(37, 99, 235, 0.25), 0 20px 60px -20px rgba(37, 99, 235, 0.45)',
        card: '0 18px 40px -24px rgba(2, 8, 23, 0.9)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(ellipse at top, rgba(37,99,235,0.18), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.12), transparent 50%)',
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.4s ease-out both',
        shimmer: 'shimmer 1.8s infinite linear',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
