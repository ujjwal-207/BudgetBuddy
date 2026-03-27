import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '.up.railway.app',
  ...((process.env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean) || [])
]

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
