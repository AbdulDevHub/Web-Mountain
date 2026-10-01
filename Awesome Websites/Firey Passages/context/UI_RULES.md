<!--
  UI_RULES.md — Component hierarchy, UX patterns, and interaction rules.
  Reference this file when creating or modifying React components,
  handling playback controls, or updating user interaction flows.
-->

# UI Rules & Patterns

## Component Hierarchy
```
App (Top-level orchestrator & state container)
 ├── Header (Story selection, Add/Delete actions, Voice & Engine pickers)
 ├── main.app-main (Two-column responsive layout)
 │    ├── StoryView (Story reader, metadata, font sizing, empty state)
 │    └── right-column
 │         ├── AudioPanel (Canvas visualizer, controls, seekbar, TTS status)
 │         └── GradientPanel (Signature fluid ambient visualizer)
 ├── DropOverlay (Fullscreen drag-and-drop target for .txt files)
 ├── Toast (Floating status and alert notifications)
 └── footer.app-footer (App information and credits)
```

---

## State Management Rules
1. **Audio Instances in Refs**: `SegmentPlayer`, `TTSClient`, `AudioContext`, and `AnalyserNode` must be held in React `useRef` to survive re-renders and avoid recreating audio pipelines.
2. **Decoupled Playhead Updates**: The high-frequency timeline updates (`timeupdate`, `requestAnimationFrame`) drive slider styling (`--progress`, `--buffered`) and canvas drawing directly, minimizing full-component React tree re-renders.
3. **Session Lifecycle**: When opening a story or changing voice/engine, increment `openTokenRef` to invalidate any in-flight asynchronous operations or stale callbacks.

---

## Visualizer & Canvas Guidelines
- Must adapt dynamically to device pixel ratio (`width` / `height` attributes synced with client bounding rect).
- When audio is paused or idle, render a gentle ambient sine wave so the panel never appears frozen or empty.
- When audio is playing, use gradient-filled rounded bars reflecting frequency energy from the `AnalyserNode`.

---

## Accessibility & Keyboard Shortcuts
- **Interactive Element Labels**: All custom dropdowns, inputs, and icon buttons must include descriptive `aria-label` and `title` attributes.
- **Global Hotkeys**:
  - Shortcuts must be ignored when typing inside `<input>`, `<textarea>`, or `<select>`.
  - Shortcuts must be ignored when meta/ctrl/alt modifier keys are pressed.
  - `Space`: Toggle Play/Pause.
  - `ArrowLeft` / `ArrowRight`: Seek ±10 seconds.
  - `A`, `Q`, `W`, `E`, `R`, `T`: Direct playback rate shortcuts (1×, 1.5×, 2×, 2.5×, 3×, 4×).

---

## File Handling & Drag-and-Drop
- Track drag depth with a counter (`dragDepthRef`) to avoid premature overlay dismissal when dragging over child elements.
- Validate incoming files: filter for `.txt` extensions or `text/*` MIME types and enforce a 10 MB maximum size cap.
- Provide detailed toast reports indicating the number of stories added, updated, or skipped.
