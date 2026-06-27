import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Use 127.0.0.1 (not localhost) so the proxy hits Laravel on IPv4, not a stale Node listener on ::8787.
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8787'

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
    ],
  }
})