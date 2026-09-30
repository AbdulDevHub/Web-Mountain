// Runs Kokoro-82M (via kokoro-js + transformers.js + ONNX Runtime Web) inside
// a Web Worker so inference never blocks the UI or the visualizer.
//
// Bundled by build.mjs into vendor/tts-worker.js. Chrome extension pages may
// not load scripts or WASM from a CDN, so the ONNX Runtime files are shipped
// next to this worker and referenced via wasmPaths below.
//
// Protocol (main thread <-> worker):
//   -> { type: "init", device: "wasm" | "webgpu" }
//   <- { type: "progress", loaded, total }          model download progress
//   <- { type: "info", message }
//   <- { type: "ready", device, dtype, threads }
//   -> { type: "generate", id, text, voice }
//   <- { type: "audio", id, samples: Float32Array, sampleRate }
//   <- { type: "error", id?, message }

import { KokoroTTS } from "kokoro-js"
import { env } from "@huggingface/transformers"

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX"

env.allowLocalModels = false
env.useBrowserCache = true // model + voices are cached after the first download

const onnxWasm = env.backends.onnx.wasm
onnxWasm.wasmPaths = new URL("./", import.meta.url).href // vendor/ folder
onnxWasm.proxy = false
// Threads need SharedArrayBuffer, i.e. cross-origin isolation (enabled in
// manifest.json). Without it ONNX Runtime silently runs single-threaded.
const threads = self.crossOriginIsolated
  ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) >> 1))
  : 1
onnxWasm.numThreads = threads

const post = (msg, transfer) => self.postMessage(msg, transfer)

let tts = null

// ---- aggregate per-file download progress into one number ----
const files = new Map()
let lastProgressPost = 0
function onProgress(p) {
  if (p.file && p.status === "progress") files.set(p.file, { loaded: p.loaded, total: p.total })
  else if (p.file && p.status === "done") {
    const f = files.get(p.file)
    if (f) f.loaded = f.total
  }
  const now = performance.now()
  if (now - lastProgressPost < 120 && p.status !== "done") return
  lastProgressPost = now
  let loaded = 0
  let total = 0
  for (const f of files.values()) {
    loaded += f.loaded
    total += f.total
  }
  post({ type: "progress", loaded, total })
}

async function load(device) {
  const opts = device === "webgpu" ? { device: "webgpu", dtype: "fp32" } : { device: "wasm", dtype: "q8" }
  files.clear()
  const model = await KokoroTTS.from_pretrained(MODEL_ID, { ...opts, progress_callback: onProgress })
  return { model, ...opts }
}

async function init(requested) {
  let device = requested
  if (device === "webgpu" && !("gpu" in navigator)) {
    post({ type: "info", message: "WebGPU isn't available here, using the CPU engine instead." })
    device = "wasm"
  }
  let loaded
  try {
    loaded = await load(device)
  } catch (err) {
    if (device !== "webgpu") throw err
    post({ type: "info", message: `WebGPU failed (${err?.message || err}); using the CPU engine instead.` })
    loaded = await load("wasm")
  }
  tts = loaded.model
  post({ type: "ready", device: loaded.device, dtype: loaded.dtype, threads })
}

async function generate({ id, text, voice }) {
  const out = await tts.generate(text, { voice })
  const samples = new Float32Array(out.audio) // copy out of the ORT tensor buffer
  post({ type: "audio", id, samples, sampleRate: out.sampling_rate }, [samples.buffer])
}

// Handle messages strictly one at a time.
let chain = Promise.resolve()
self.onmessage = (e) => {
  const msg = e.data
  chain = chain.then(async () => {
    try {
      if (msg.type === "init") await init(msg.device)
      else if (msg.type === "generate") await generate(msg)
    } catch (err) {
      post({ type: "error", id: msg.id, message: String(err?.message || err) })
    }
  })
}
