import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mira/shared-types': path.resolve(__dirname, '../../libs/shared-types/src'),
      '@mira/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src'),
      '@mira/ui-config': path.resolve(__dirname, '../../libs/ui-config/src'),
    },
  },
  server: { port: 3000, host: true },
})
