/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        // Dynamic theme colors - overridden at runtime from cover art
        primary: 'var(--color-primary, #6366f1)',
        'primary-light': 'var(--color-primary-light, #818cf8)',
        'primary-dark': 'var(--color-primary-dark, #4f46e5)',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.16)'
        }
      },
      backdropBlur: {
        glass: '20px'
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite'
      }
    }
  },
  plugins: []
}
