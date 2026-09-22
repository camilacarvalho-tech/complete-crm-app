import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5474,
    strictPort: false,
    open: true,
    proxy: {
      '/__nx_erp_cloud': {
        target: 'https://nx-erp-disparo-nuvem.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__nx_erp_cloud/, '') || '/health',
      },
    },
  },
  preview: {
    port: 5474,
    strictPort: false,
  },
})