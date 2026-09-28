/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EchoPay brand tokens. These map to CSS variables in index.css so
        // the whole app re-skins from this one place.
        brand: {
          red: "rgb(var(--brand-red) / <alpha-value>)",
          "red-deep": "rgb(var(--brand-red-deep) / <alpha-value>)",
          "red-bright": "rgb(var(--brand-red-bright) / <alpha-value>)",
          cream: "rgb(var(--brand-cream) / <alpha-value>)",
          "cream-hi": "rgb(var(--brand-cream-hi) / <alpha-value>)",
          blush: "rgb(var(--brand-blush) / <alpha-value>)",
          glow: "rgb(var(--brand-glow) / <alpha-value>)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
        },
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surface2: "rgb(var(--surface2) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        positive: "rgb(var(--positive) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      borderRadius: {
        card: "18px",
        ctrl: "12px",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
