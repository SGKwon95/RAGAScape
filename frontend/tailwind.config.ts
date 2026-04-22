import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        notion: {
          bg: "#ffffff",
          sidebar: "#f7f6f3",
          hover: "#ebebea",
          active: "#e9eff7",
          border: "#e9e9e7",
          divider: "#d9d9d7",
          text: "#37352f",
          "text-2": "#787672",
          "text-3": "#9b9a97",
          blue: "#2383e2",
          "blue-bg": "#e7f0fb",
          red: "#e03e3e",
          "red-bg": "#fbe4e4",
          green: "#0f7b6c",
          "green-bg": "#ddedea",
          orange: "#c76b15",
          "orange-bg": "#faebdd",
          purple: "#6940a5",
          "purple-bg": "#eae4f2",
        },
      },
      borderRadius: {
        notion: "3px",
      },
      boxShadow: {
        "notion-sm":
          "rgba(15,15,15,0.04) 0px 0px 0px 1px, rgba(15,15,15,0.03) 0px 3px 6px, rgba(15,15,15,0.06) 0px 9px 24px",
        "notion-popover":
          "rgba(15,15,15,0.05) 0px 0px 0px 1px, rgba(15,15,15,0.1) 0px 3px 6px, rgba(15,15,15,0.2) 0px 9px 24px",
      },
    },
  },
  plugins: [],
};

export default config;
