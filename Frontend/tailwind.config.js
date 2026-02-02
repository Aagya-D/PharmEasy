/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Medical Blue as Primary
        'medical-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Map Tailwind colors to CSS variables
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        "primary-dark": "var(--color-primary-dark)",
        "primary-bg": "var(--color-primary-bg)",

        secondary: "var(--color-secondary)",
        "secondary-light": "var(--color-secondary-light)",
        "secondary-dark": "var(--color-secondary-dark)",

        success: "var(--color-success)",
        "success-light": "var(--color-success-light)",
        "success-dark": "var(--color-success-dark)",

        error: "var(--color-error)",
        "error-light": "var(--color-error-light)",
        "error-dark": "var(--color-error-dark)",

        warning: "var(--color-warning)",
        "warning-light": "var(--color-warning-light)",
        "warning-dark": "var(--color-warning-dark)",

        info: "var(--color-info)",
        "info-light": "var(--color-info-light)",
        "info-dark": "var(--color-info-dark)",

        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
        },

        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          light: "var(--color-text-light)",
        },

        border: "var(--color-border)",
        "border-dark": "var(--color-border-dark)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
    },
  },
  plugins: [],
};
