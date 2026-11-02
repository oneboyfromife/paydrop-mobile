/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  // The default class is composed by config/fonts.ts, outside component scanning.
  safelist: ["font-sans"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        purple: {
          100: "#EAE6FF",
          200: "#C7BFFF",
          300: "#A499FF",
          400: "#8173FF",
          500: "#6C63FF",
        },
        sky: {
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
        },
        grey: {
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
        },
        black: "#1A1A1A",
      },
      fontFamily: {
        sans: ["Satoshi-Regular"],
        satoshi: ["Satoshi-Regular"],
        "satoshi-regular": ["Satoshi-Regular"],
        "satoshi-light": ["Satoshi-Light"],
        "satoshi-medium": ["Satoshi-Medium"],
        "satoshi-bold": ["Satoshi-Bold"],
        "satoshi-black": ["Satoshi-Black"],
        "satoshi-italic": ["Satoshi-Italic"],
        mono: ["SpaceMono"],
      },
    },
  },
  plugins: [],
};
