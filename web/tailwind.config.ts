import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--reader-font)", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
      },
      maxWidth: {
        reader: "var(--reader-max-width, 800px)",
      },
      boxShadow: {
        soft: "0 16px 36px rgba(34, 64, 116, 0.12)",
        card: "0 12px 24px rgba(29, 54, 96, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
