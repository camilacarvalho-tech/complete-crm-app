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
  },
  preview: {
    port: 5474,
    strictPort: false,
  },
})