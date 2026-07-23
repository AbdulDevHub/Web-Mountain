import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // Ensures JS and CSS bundles load correctly relative to the dist folder
  build: {
    outDir: "../file-renamer", // <-- Outputs right next to your screenshot!
    emptyOutDir: true,
  },
})
