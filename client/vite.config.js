import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'

function getBuildInfo() {
  let hash = 'unknown'
  try {
    hash = execSync('git rev-parse --short HEAD', { cwd: path.resolve(__dirname, '..') }).toString().trim()
  } catch (e) {}
  return {
    hash,
    time: new Date().toISOString(),
  }
}

const info = getBuildInfo()

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_HASH__: JSON.stringify(info.hash),
    __BUILD_TIME__: JSON.stringify(info.time),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
