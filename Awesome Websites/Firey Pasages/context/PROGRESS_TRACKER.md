<!--
  PROGRESS_TRACKER.md — Living task and progress log for AI coding sessions.
  Maintains current state, roadmap, and chronological record of changes.
  Update this file proactively whenever features are implemented or decisions are made.
-->

# Progress Tracker

## Current State
- **Visual Mode Switcher & Looping Videos**: Waveform, Brown Noise, and Cozy Cottage video modes with ambient sound control.
- **Immersive Fullscreen Mode**: Full screen with `F` / double-click, auto-hiding HUD.
- **Bella Default Voice**: `af_bella` is now the default voice (was `af_heart`).
- **Audio File Import**: Users can drop or open `.wav`/`.mp3` files to load pre-generated audio directly — skips TTS generation entirely.
- **Batch Generator (`generation/generate.mjs`)**: Node.js offline script that takes a folder path and generates `.wav` for every `.txt` file that doesn't already have audio, using Bella.
- **Generation Folder**: `experiment/` renamed to `generation/`. `npm run generate` runs the batch script.
- **TTS Performance**: ONNX WASM thread count increased from `hardwareConcurrency/2` (max 4) to full `hardwareConcurrency` (max 8). Text pre-cleaned before inference.
- **Gradient Panel Shortened**: Gradient panel now fixed at 85px; audio panel with visual stage grows to fill remaining space (315px video height).
- **URL removed from story format**: The `URL:` metadata field removed from all user-facing docs, examples, and code comments.
- **Migrated to Vite + React 19**: Full modern React app, engine & audio pipeline intact.
- **Tests Passing**: All 22 native unit tests in `tests/logic.test.mjs` pass cleanly.

## In Progress
- Continuous user testing and visual feedback.

## Next Steps
- [ ] Add optional dark/light theme toggle or user color customization.
- [ ] Support custom speech rate steps or pitch modulation if Kokoro adds pitch support.
- [ ] Enhance mobile layout with swipe gesture seeking.

## Session Log
### 2026-09-30 — UX Polish, Bella Default, Audio Import & Batch Generator
- Added visual modes to `AudioPanel.jsx` allowing instant switching between:
  - **Waveform**: Live reactive frequency visualizer and ambient sine wave.
  - **Brown Noise**: High-def looping video ambience (`/videos/brown-noise.webm`).
  - **Cozy Cottage**: High-def looping fireplace and rain ambience video (`/videos/cozy-cottage.webm`).
- Added seamless looping logic with `loop`, `preload="auto"`, `playsInline`, and backup replay handler.
- Added ambient audio toggle and volume slider for video ambient sound, persisting to `localStorage`.
- Implemented full screen mode with native Fullscreen API, keyboard shortcut `F`, double-click support, and an auto-hiding interactive floating HUD with timeline seeker and playback buttons.
- Added global keyboard shortcut `M` for story audio mute/unmute.
- Fixed `createLinearGradient` non-finite exception during waveform playback by validating `binCount`, enforcing positive finite step size, and bounding bar coordinates.
- Removed background gradient and backdrop filter from `.visual-stage-top` for clean, unobstructed video and visualizer viewing.
- Preserved all element IDs, styling tokens, and 22/22 unit tests.

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
