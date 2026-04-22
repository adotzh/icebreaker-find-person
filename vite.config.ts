import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appsScriptUrl = env.VITE_API_BASE_URL ?? ''

  return {
    base: './',
    plugins: [react()],
    server: {
      proxy: appsScriptUrl
        ? {
            '/api': {
              target: appsScriptUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  }
})
