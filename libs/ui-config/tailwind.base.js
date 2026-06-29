// Shared design tokens — BOTH admin and mobile extend this
// Brand: Violet Luxe (confirmed)
// All values match Tailwind v3 violet palette exactly:
//   brand.DEFAULT = violet-600
//   brand.dark    = violet-900
//   brand.soft    = violet-100
//   brand.bg      = violet-50
//   brand.text    = violet-950
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E11D74', // violet-600
          dark: '#9D1352', // violet-900
          soft: '#FCE7F3', // violet-100
          bg: '#FFF8FB', // violet-50
          text: '#1A0A10', // violet-950
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Montserrat', 'sans-serif'],
      },
    },
  },
}
