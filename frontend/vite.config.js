import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CodeSense AI — Vite config · by Nitish Singh
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
})
