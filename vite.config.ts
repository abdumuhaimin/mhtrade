import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
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
    },
  },
})
