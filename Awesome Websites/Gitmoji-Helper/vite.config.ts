import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
  resolve: {
    // Ensure only a single instance of the library (and its onnxruntime-web
    // dependency) ends up in the bundle — duplicate instances are what cause
    // "Cannot read properties of undefined (reading 'registerBackend')".
    dedupe: ["@huggingface/transformers"],
  },
})
