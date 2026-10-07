// NativeWind 5 runs Tailwind CSS through PostCSS. Expo finds this file by its name:
// keep it .mjs (a .cjs name is not picked up).
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
