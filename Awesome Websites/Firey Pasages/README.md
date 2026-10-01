# Fiery Passages

## Project Overview

Fiery Passages is a personal story audio player that turns written stories into spoken audio entirely on your device. You drop in `.txt` story files, choose from a wide variety of English voices, and press play. The audio is synthesized locally using the high-quality Kokoro-82M neural model running in WebAssembly or WebGPU — meaning no audio leaves your computer, there are no subscriptions or API keys, and your listening experience works completely offline once the voice model is downloaded. Generated audio is stored in your browser's IndexedDB so re-listening is instant.

The player features an integrated visual stage where you can switch seamlessly between a dynamic audio frequency **Waveform** visualizer and smoothly looping ambient videos (**Cozy Cottage** fireplace & rain and **Brown Noise**), complete with an immersive **Full Screen Mode** with keyboard hotkeys and floating interactive playback HUD.

---

## Quick Start (Web App)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Vite development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.
4. Click **＋ Add stories** or drag & drop `.txt` files onto the window.
5. Press **▶** to start generating and listening.

To build for production:

```bash
npm run build
npm run preview
```

---

## Use as a Chrome Extension

1. Run `npm run build` to generate the production bundle in `dist/`.
2. Open `chrome://extensions` in Google Chrome or any Chromium-based browser.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `dist/` directory (or the project root for direct source extension loading).
5. Click the extension icon or press **Alt+E** to launch Fiery Passages in a tab.

---

## Story File Format

Stories are standard `.txt` text files. You can include an optional metadata header separated by fifty `=` characters:

```
Title: Batteries Not Included
Description: I hate it when the batteries die.
==================================================

Story text here onwards...
```

- `Description` is optional.
- If no header is present, the filename becomes the story title.
- Re-uploading a story with the same title updates the existing story instead of duplicating it.
- Story text files follow this schema.

---

## Playback & Controls

- **Voice Selection**: Choose between dozens of American and British voices categorized by traits and voice grades.
- **Engine Options**:
  - **CPU (WASM)**: 86 MB model download, compatible with all devices.
  - **GPU (WebGPU)**: 326 MB model download, faster synthesis on supported hardware.
- **Speed Controls**: Adjust playback rate from 0.5× to 2.0× via buttons or keyboard shortcuts.
- **Lookahead & Battery Saving**: Audio generates up to 10 minutes ahead of your current playhead to avoid running your CPU needlessly. Click **Generate all now** to remove the cap.
- **Visualizer**: Real-time frequency analyzer visualizes speech playback.

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| **Space** | Play / Pause |
| **Arrow Left** | Rewind 10 seconds |
| **Arrow Right** | Fast forward 10 seconds |
| **A / Q / W / E / R / T** | Set playback speed to 1× / 1.5× / 2× / 2.5× / 3× / 4× |

---

## Development & Testing

- **Unit Tests**:

  ```bash
  npm test
  ```

  Runs 22 unit tests checking the story parser, chunker boundary rules, pause timing, and WAV audio encoder.
- **Fake Engine Mode**:
  Run `npm run dev` and navigate to `http://localhost:5173/?engine=fake` to test UI and player flows using a lightweight tone-babble generator without downloading the full Kokoro voice model.
- **Rebuilding the TTS Worker**:
  To update or recompile the speech worker and copy ONNX WASM binaries:

  ```bash
  npm run build:worker
  ```
