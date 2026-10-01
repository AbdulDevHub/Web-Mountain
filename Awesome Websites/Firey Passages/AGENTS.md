<!--
  AGENTS.md — Machine-readable guide for AI coding agents working on Fiery Passages.
  Provides critical project architecture, commands, rules, and boundaries.
  After any meaningful change to this project, update this file, context/PROGRESS_TRACKER.md,
  and the "Project Overview" section of README.md to reflect the current state — do this proactively, without being asked.
-->

# Fiery Passages (Agent Guide)

## Project Overview
Fiery Passages is an on-device story audio player built with React and Vite. It parses story text files, synthesizes speech locally using Kokoro-82M (via ONNX Runtime Web in WebAssembly/WebGPU with no cloud backend), and delivers gapless audio playback with visualizer frequency analysis, smoothly looping ambient video players (Cozy Cottage and Brown Noise), and an immersive full screen mode.

## Tech Stack
- **Framework & Bundler**: React 19, Vite 6, `@vitejs/plugin-react`
- **UI & Icons**: Vanilla CSS design system, Lucide React
- **TTS Engine**: Kokoro TTS (`kokoro-js`, `@huggingface/transformers`, `onnxruntime-web`)
- **Storage**: IndexedDB (stories & audio chunk cache)
- **Asset Resolution**: `src/lib/assets.js` (`assetUrl()`) joins `public/` paths onto `import.meta.env.BASE_URL`
- **Audio Processing**: Custom WAV encoder, silence trimmer, dual `<audio>` element ping-pong player (`SegmentPlayer`), Web Audio API AnalyserNode
- **Media & Visuals**: Hardware-accelerated WebM looping video backgrounds, reactive Web Audio spectrum canvas, Fullscreen API with interactive HUD

## Setup & Run Commands
- `npm install`: Install dependencies
- `npm run dev`: Launch local Vite development server with COOP/COEP headers on `http://localhost:5173`
- `npm test`: Run 22 unit tests using Node.js native test runner (`node --test tests/*.test.mjs`)
- `npm run build`: Compile production bundle to `dist/`
- `npm run build:worker`: Recompile `src/tts-worker.js` with `esbuild` and copy ONNX WASM binaries to `vendor/` and `public/vendor/`

## Key Conventions & Constraints
- **Cross-Origin Isolation**: Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so `SharedArrayBuffer` enables multi-threaded ONNX inference.
- **Worker Isolation**: Inference must always execute inside the Web Worker (`public/vendor/tts-worker.js` or `src/lib/dev/fake-tts-worker.js`) to prevent audio dropouts and UI frame stutters.
- **Cache Determinism**: Audio chunks are hashed and keyed by `setId = audioSetId(story, voice)`. Chunker logic must stay deterministic to ensure valid cache hits.
- **Backwards Compatibility**: Core algorithms in `src/lib/` (`story-parser.js`, `chunker.js`, `wav.js`) must preserve export signatures tested in `tests/logic.test.mjs`.

## Boundaries
- Do not edit binary files in `vendor/` or `public/vendor/` directly (`ort-wasm-simd-threaded.jsep.*`). Rebuild only via `npm run build:worker`.
- Avoid adding heavy CSS utility frameworks (e.g. Tailwind) without explicit request; maintain the existing cohesive Vanilla CSS design system.
- **No origin-absolute asset paths**: The app is deployed under a nested sub-path (Netlify serves it from `Awesome Websites/Firey Passages/firey-passages/`), so paths beginning with `/` resolve against the site root and 404. Always reference files in `public/` through `assetUrl()` from `src/lib/assets.js`. This applies to `<img src>`, `<video src>`, worker URLs, and CSS `url()`. It does not show up locally because the dev server and preview both serve the app at `/`.

## Where to Look for More
- `README.md`: High-level user documentation and setup guide.
- `context/PROGRESS_TRACKER.md`: Active tasks, backlog, and dated session log.
- `context/ARCHITECTURE.md`: In-depth audio pipeline, player state machine, and IndexedDB schema.
- `context/UI_RULES.md`: Component responsibilities, keyboard controls, and UX patterns.
- `context/UI_TOKENS.md`: Design variables, color palette, typography, and styling tokens.
