/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "var(--color-bg-base)",
        surface: "var(--color-bg-surface)",
        elevated: "var(--color-bg-elevated)",
        subtle: "var(--color-bg-subtle)",
        border: {
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
        },
        accent: {
          amber: {
            DEFAULT: "var(--color-accent-amber)",
            hover: "var(--color-accent-amber-hover)",
            muted: "var(--color-accent-amber-muted)",
          },
          teal: {
            DEFAULT: "var(--color-accent-teal)",
            hover: "var(--color-accent-teal-hover)",
            muted: "var(--color-accent-teal-muted)",
          },
          danger: {
            DEFAULT: "var(--color-accent-danger)",
            hover: "var(--color-accent-danger-hover)",
            muted: "var(--color-accent-danger-muted)",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
