import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nxErpInboundPlugin } from './vite.nxErpInbound'
import { metaDiagnosePlugin } from './vite.metaDiagnose'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nxErpInboundPlugin(),
    metaDiagnosePlugin(),
  ],
  server: {
    port: 5474,
    strictPort: false,
    open: true,
    proxy: {
      // CRM → NX ERP local. O navegador não chama 127.0.0.1:5000.
      '/__nx_erp_cloud': {
        target: 'https://nx-erp-disparo-nuvem.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__nx_erp_cloud/, '') || '/health',
      },
      '/__nx_erp_local': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__nx_erp_local/, '') || '/',
      },
    },
  },
  preview: {
    port: 5474,
    strictPort: false,
    proxy: {
      '/__nx_erp_cloud': {
        target: 'https://nx-erp-disparo-nuvem.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__nx_erp_cloud/, '') || '/health',
      },
      '/__nx_erp_local': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__nx_erp_local/, '') || '/',
      },
    },
  },
})