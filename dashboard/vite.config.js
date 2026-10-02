import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
      '/v1': 'http://localhost:8788'
    }
  }
})
