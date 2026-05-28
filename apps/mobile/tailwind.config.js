const baseConfig = require('../../libs/ui-config/tailwind.base.js')

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../libs/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
}
