// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige las peticiones que empiezan con /api a tu backend de Flask
      '/api': {
        target: 'http://127.0.0.1:5000', // La dirección de tu backend
        changeOrigin: true, // Necesario para que el proxy funcione correctamente
        secure: false,      // No necesitas SSL en desarrollo
      },
    },
  },
})