/** @type {import('tailwindcss').Config} */
// Colors are CSS variables (src/index.css) so dark/light swap in one place,
// carried over from the old static/app.css tokens.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        "surface-2": v("surface-2"),
        "surface-3": v("surface-3"),
        line: v("border"),
        ink: v("text"),
        "ink-soft": v("text-soft"),
        muted: v("text-muted"),
        primary: v("primary"),
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        purple: v("purple"),
        cyan: v("cyan"),
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      borderRadius: { card: "10px" },
      boxShadow: { card: "var(--shadow-sm)", pop: "var(--shadow-md)" },
    },
  },
  plugins: [],
};
