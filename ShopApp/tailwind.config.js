// Gün 36 — NativeWind: Tailwind class'larını React Native'e getir
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class', // useTema ile senkron — bkz. app/_layout.tsx (colorScheme.set)
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        danger: '#FF3B30',
        shopapp: {
          bg: '#F2F2F7',
          kart: '#FFFFFF',
          metin: '#1C1C1E',
          ikincil: '#6C6C70',
        },
      },
    },
  },
  plugins: [],
};
