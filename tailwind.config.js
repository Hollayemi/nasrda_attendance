/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Sampled from the NASRDA seal (same tokens as the web app)
        navy: { DEFAULT: '#19297D', light: '#2C3FA0', dark: '#101B57', 50: '#EEF1FB', 100: '#DDE3F7' },
        brand: { green: '#0F8A5F', amber: '#D99A00', red: '#C0392B' },
        surface: { DEFAULT: '#F3F6FA', card: '#FFFFFF', line: '#E3E9F0', input: '#CFD8E3' },
        ink: { DEFAULT: '#14212E', muted: '#6B7A8C' },
        tint: {
          green: '#DFF5EA', 'green-text': '#0B6B49',
          red: '#FDE2DF', 'red-text': '#8E2B20',
          amber: '#FFF1CC', 'amber-text': '#6E5100',
        },
      },
      borderRadius: { card: 16, xl2: 20 },
    },
  },
  plugins: [],
};
