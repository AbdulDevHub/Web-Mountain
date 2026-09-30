// Bundles the Kokoro TTS worker and copies ONNX Runtime's WASM files into
// vendor/. Chrome extension pages can't load code from a CDN, so everything
// the speech engine needs has to ship inside the extension.
//
//   npm install && npm run build
//
// The built files are committed/zipped with the extension, so end users don't
// need Node; you only rebuild when upgrading kokoro-js.
import { build } from "esbuild"
import { copyFileSync, mkdirSync, statSync } from "node:fs"

mkdirSync("vendor", { recursive: true })
mkdirSync("public/vendor", { recursive: true })

await build({
  entryPoints: ["src/tts-worker.js"],
  outfile: "vendor/tts-worker.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
  minify: true,
  legalComments: "none",
  // Use ONNX Runtime's "external wasm" entry: the glue (.mjs) and .wasm are
  // loaded from vendor/ at runtime (env.backends.onnx.wasm.wasmPaths), which
  // is what lets multi-threading work inside an extension.
  conditions: ["onnxruntime-web-use-extern-wasm"],
  logLevel: "info",
})
copyFileSync("vendor/tts-worker.js", "public/vendor/tts-worker.js")

for (const f of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) {
  copyFileSync(`node_modules/onnxruntime-web/dist/${f}`, `vendor/${f}`)
  copyFileSync(`node_modules/onnxruntime-web/dist/${f}`, `public/vendor/${f}`)
  console.log(`copied ${f} (${(statSync(`vendor/${f}`).size / 1e6).toFixed(1)} MB)`)
}

