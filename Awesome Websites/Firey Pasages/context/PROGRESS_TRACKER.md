<!--
  PROGRESS_TRACKER.md — Living task and progress log for AI coding sessions.
  Maintains current state, roadmap, and chronological record of changes.
  Update this file proactively whenever features are implemented or decisions are made.
-->

# Progress Tracker

## Current State
- **Migrated to Vite + React 19**: Successfully converted the legacy HTML/Vanilla JS codebase to a modern React 19 application powered by Vite 6.
- **Engine & Audio Pipeline Intact**: Maintained zero-regression on-device TTS using Kokoro-82M, ONNX Runtime Web (WASM & WebGPU), Web Worker isolation, and dual `<audio>` element `SegmentPlayer`.
- **Component Architecture**: Built clean, modular React components (`Header`, `StoryView`, `AudioPanel`, `GradientPanel`, `DropOverlay`, `Toast`).
- **Tests Passing**: All 22 native unit tests in `tests/logic.test.mjs` pass cleanly (`npm test`).
- **Production Build Validated**: `npm run build` generates production assets with zero errors.
- **Agent Context Scaffolded**: `AGENTS.md`, `README.md`, and `context/` documentation initialized.

## In Progress
- Complete initial validation of development server and preview environment.

## Next Steps
- [ ] Add optional dark/light theme toggle or user color customization.
- [ ] Support custom speech rate steps or pitch modulation if Kokoro adds pitch support.
- [ ] Add export feature for downloaded/synthesized story WAV files into a single audio file.
- [ ] Enhance mobile layout with swipe gesture seeking.

## Session Log
### 2026-09-30 — Vite/React Conversion & Agent Context Setup
- **Converted to Vite + React**:
  - Installed `react`, `react-dom`, `lucide-react`, `vite`, and `@vitejs/plugin-react`.
  - Configured `vite.config.js` with COOP (`same-origin`) and COEP (`require-corp`) headers for multi-threaded WebAssembly / SharedArrayBuffer support.
  - Organized core logic into `src/lib/` (`story-parser.js`, `chunker.js`, `wav.js`, `library.js`, `player.js`, `voices.js`, `tts-client.js`).
  - Created modern React components: `App.jsx`, `Header.jsx`, `StoryView.jsx`, `AudioPanel.jsx`, `GradientPanel.jsx`, `DropOverlay.jsx`, and `Toast.jsx`.
  - Built modern design system in `src/index.css` featuring dark glassmorphism, responsive grid, dynamic seek slider, and animated gradient visualizer.
  - Updated `build.mjs` to mirror worker and ONNX WASM binaries to `public/vendor/`.
  - Maintained complete test compatibility for `tests/logic.test.mjs` (22/22 passing).
- **Established AI Agent Context (`/setup-agent-context`)**:
  - Created machine-readable `AGENTS.md` at project root with standing maintenance clause.
  - Updated `README.md` with jargon-light Project Overview, dev server commands, and unpacked Chrome extension steps.
  - Scaffolded `context/PROGRESS_TRACKER.md`, `context/ARCHITECTURE.md`, `context/UI_RULES.md`, and `context/UI_TOKENS.md`.
