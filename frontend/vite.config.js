import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Admin API routes - must come first to avoid conflicts
      '/admin': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      // Dynamic API routes
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      // Server info endpoint
      '/server-info': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      // Health check endpoint
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
})
