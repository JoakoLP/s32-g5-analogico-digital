import { defineConfig } from 'vite'
import react from '@vitejs/react-swc'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige las peticiones locales de /api al puerto del backend de Python
      '/api': {
        target: '[http://127.0.0.1:8000](http://127.0.0.1:8000)',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})