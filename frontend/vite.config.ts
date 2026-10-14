import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backend = { target: 'http://localhost:8080', changeOrigin: true }

// In development the browser sees one origin: the API and the Swagger docs are proxied to Spring Boot.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/swagger-ui': backend,
      '/swagger-ui.html': backend,
      '/v3/api-docs': backend,
    },
  },
})
