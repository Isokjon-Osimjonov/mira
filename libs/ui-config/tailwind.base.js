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
          DEFAULT: '#7C3AED', // violet-600
          dark:    '#4C1D95', // violet-900
          soft:    '#EDE9FE', // violet-100
          bg:      '#F5F3FF', // violet-50
          text:    '#2E1065', // violet-950
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body:    ['Montserrat', 'sans-serif'],
      },
    },
  },
}
