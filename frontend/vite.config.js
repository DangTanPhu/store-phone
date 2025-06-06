// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/frontend', // <-- Chỉ định nơi xuất file build
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:7070', // proxy request API về backend
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
