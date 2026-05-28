import type { Config } from 'tailwindcss'
const baseConfig = require('../../libs/ui-config/tailwind.base.js')

export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../libs/**/*.{ts,tsx}',
  ],
  theme: {
    ...(baseConfig.theme ?? {}),
    extend: {
      ...(baseConfig.theme?.extend ?? {}),
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
} satisfies Config
