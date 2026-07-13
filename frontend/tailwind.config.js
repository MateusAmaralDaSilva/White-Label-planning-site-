/** @type {import('tailwindcss').Config} */

/**
 * Tokens resolve to CSS variables (set per theme in src/config/themes.ts),
 * so a theme swap changes the variable values — never the components.
 * The `<alpha-value>` placeholder keeps opacity utilities like `bg-success/12`.
 */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        sidebar: token('sidebar'),
        surface: { DEFAULT: token('surface'), hover: token('surface-hover') },
        border: token('border'),
        accent: { DEFAULT: token('accent'), hover: token('accent-hover') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), faint: token('ink-faint') },
        success: token('success'),
        danger: token('danger'),
        warning: token('warning'),
        info: token('info'),
      },
      // Estética 100% retangular: zera TODO o raio de borda, inclusive `full`.
      // Única exceção é o Spinner, que usa um valor explícito (`rounded-[50%]`)
      // fora do token porque um anel quadrado girando pareceria quebrado.
      borderRadius: {
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease',
      },
    },
  },
  plugins: [],
}
