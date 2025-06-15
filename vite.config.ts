import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'node:process'; // Import cwd from node:process

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno del archivo .env en la raíz del proyecto
  // El tercer argumento '' asegura que se carguen todas las variables (sin prefijo VITE_)
  const env = loadEnv(mode, cwd(), ''); // Use the imported cwd function

  return {
    plugins: [react()],
    define: {
      // Hace que process.env.API_KEY esté disponible en el código del cliente
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Puedes definir otras variables de process.env aquí si las necesitas
      // 'process.env.NODE_ENV': JSON.stringify(mode), // Vite maneja esto, pero es un ejemplo
    },
    server: {
      port: 5173, // Puedes cambiar el puerto si es necesario
    }
  };
});