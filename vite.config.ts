import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '');

  return {
    plugins: [react()],
    base: './', // <--- Asegúrate de que esta línea esté presente o sea ''
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist', // <--- Asegúrate de que el directorio de salida es 'dist'
    }
  };
});