<!--
  ARCHITECTURE.md — System architecture, data flow, and concurrency model.
  Consult this document before making structural changes to the speech pipeline,
  player state machine, or persistence layers.
-->

# System Architecture

## Overview
Fiery Passages is an on-device story audio synthesizer and player. It operates completely client-side in the browser or as a Chrome Extension with zero external server dependencies for inference.

```
[ User Input: .txt Story / Drop ]
               │
               ▼
       [ story-parser.js ]
               │
               ▼
       [ IndexedDB: stories ] ──── (Text hash, Metadata)
               │
               ▼
         [ chunker.js ] ────────── (Pauses, sentence splits, lookahead cap)
               │
               ▼
     [ Web Worker: tts-worker.js ]
          ├── Kokoro-82M ONNX model
          └── ONNX Runtime Web (WASM SIMD / WebGPU)
               │
               ▼ (Float32Array PCM samples)
          [ wav.js ] ───────────── (16-bit PCM WAV + silence trimmer)
               │
               ▼
       [ IndexedDB: audio ] ────── (Keyed by storyId + voice + textHash)
               │
               ▼
     [ player.js: SegmentPlayer ]
          ├── Audio Element A (Active playback)
          └── Audio Element B (Preloaded next segment)
               │
               ▼
     [ Web Audio AnalyserNode ] ── (Real-time frequency visualizer)
               │
               ▼
         [ Speakers ]
```

---

## Core Subsystems

### 1. Story Ingestion & Text Processing
- **`src/lib/story-parser.js`**: Parses story files with optional header keys (`Title:`, `Description:`, `URL:`) followed by an optional separator line (`====================`). Handles CRLF, UTF-8 BOM, and falls back to filename if header is missing.
- **`src/lib/chunker.js`**: Breaks story text into speech-friendly chunks bounded by character counts (`MAX_CHARS = 240`, `FIRST_MAX_CHARS = 120`). Generates contextual pause durations between sentences, line breaks, and paragraph boundaries. Deterministic chunking ensures cache keys remain stable.

### 2. Neural Speech Synthesis Engine
- **`src/lib/tts-client.js`**: Main-thread bridge managing worker lifecycle, progress events, and message promises.
- **`public/vendor/tts-worker.js`** (source: `src/tts-worker.js`): Isolated worker running `@huggingface/transformers` and `kokoro-js`.
- **WASM / WebGPU**:
  - `wasm`: 86 MB model (`onnx-community/Kokoro-82M-v1.0-ONNX` q8). Runs multi-threaded using `SharedArrayBuffer` when cross-origin isolated.
  - `webgpu`: 326 MB model (fp32). Runs on device GPU if `navigator.gpu` is supported, falling back to WASM on error.
- **Fake Engine** (`public/dev/fake-tts-worker.js`): Generates synthetic tones for fast UI and automated test validation without network downloads.

### 3. Audio Timeline & Gapless Playback (`SegmentPlayer`)
- Audio is synthesized as a sequence of independent WAV segments.
- **Ping-Pong Dual Audio Elements**: Two `<audio>` elements alternate. While Element A is playing segment $N$, Element B preloads segment $N+1$. When segment $N$ ends, playback immediately shifts to Element B with near-zero latency.
- **Unified Timeline**: Exposes continuous seek, current time, and buffered duration across all segments.
- **Pitch-Preserved Speed**: Uses HTMLMediaElement's native `playbackRate` and `preservesPitch = true`.

### 4. Persistence Layer (`library.js`)
IndexedDB database `fiery-passages` (Version 1):
- **`stories` store**: Keyed by unique `id`. Indexed by `sourceKey` (URL or title) to prevent duplicates and allow in-place story updates.
- **`audio` store**: Keyed by `key = setId:index`.
  - `setId`: Hash of `(story.id, voice, textHash, CHUNKER_VERSION)`.
  - If text is edited or voice is switched, a new audio set is created without corrupting past sets.
