const baseConfig = require('../../libs/ui-config/tailwind.base.js')

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../libs/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E11D74',
        primaryDark: '#9D174D',
        primaryLight: '#FCE7F3',
        background: '#FFF5F9',
        text: '#500724',
        textMuted: '#9D174D',
        heroBg: '#E11D74',
        nearBlack: '#1A1A1A',
      },
    },
  },
  presets: [require('nativewind/preset')],
}
