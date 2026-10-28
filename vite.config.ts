import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev o Vite faz proxy de /api para a API Go (porta 8090), então não há CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
  },
})
