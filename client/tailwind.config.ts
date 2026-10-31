/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Refined indigo-blue brand scale (premium, deep, trustworthy)
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608dfa",
          500: "#3b6df6",
          600: "#1f4fd8",
          700: "#1a40b0",
          800: "#1c3789",
          900: "#1e346e",
          950: "#141f42",
        },
        // Warm accent for deals / CTAs / highlights
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // Warm near-black scale for dark mode (sampled from hosted app)
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          800: "#292420",
          900: "#1f1c18",
          950: "#141210",
        },
        // Velmora storefront palette (sampled from hosted app)
        cream: { DEFAULT: "#faf6ef", deep: "#f3ecdc" },
        ember: {
          50: "#fdf4ec",
          100: "#fae7d3",
          200: "#f4cba1",
          300: "#eca76c",
          400: "#e37f3d",
          500: "#d95f1c",
          600: "#c2410c",
          700: "#a5360a",
          800: "#86300f",
          900: "#6f2a12",
        },
        maroon: { light: "#8f1d16", DEFAULT: "#7a1712", deep: "#5e100c" },
        char: { DEFAULT: "#1b1b1b", soft: "#2b2b2b", card: "#151515", box: "#262626" },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.08)",
        pop: "0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.06)",
        lift: "0 12px 32px -8px rgba(16,24,40,0.22), 0 4px 12px rgba(16,24,40,0.10)",
        glow: "0 0 0 4px rgba(59,109,246,0.18)",
        "glow-accent": "0 0 0 4px rgba(249,115,22,0.16)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(2deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "tick-pop": {
          "0%": { transform: "scale(0.4)" },
          "60%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "tick-pop": "tick-pop 0.35s cubic-bezier(0.2,0.9,0.3,1.4)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.2,0.9,0.3,1.25)",
        smooth: "cubic-bezier(0.4,0,0.2,1)",
      },
    },
  },
  plugins: [],
};
