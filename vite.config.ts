import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: 3000,
    proxy: {
      '/alpaca-trade': {
        target: 'https://paper-api.alpaca.markets',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/alpaca-trade/, ''),
      },
      '/alpaca-data': {
        target: 'https://data.alpaca.markets',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/alpaca-data/, ''),
      },
      '/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yf/, ''),
      },
    },
  },
})
