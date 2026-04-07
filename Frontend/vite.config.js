import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5175,
    strictPort: false,
    // Allow error overlay to be dismissed (press Esc)
    hmr: {
      overlay: true,
    },
    proxy: {
      // Only proxy API requests to backend
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
        // Log proxy requests for debugging
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url);
          });
        }
      }
    }
  }
})
