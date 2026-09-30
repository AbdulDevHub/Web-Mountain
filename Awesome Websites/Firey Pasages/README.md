# Fiery Passages

Story audio player. Add `.txt` stories, press play, and the audio is generated **on your device** with
[Kokoro](https://github.com/hexgrad/kokoro) (no server, no API key).

## Use it
1. `chrome://extensions` → Developer mode → **Load unpacked** → pick this folder (Alt+E opens it).
2. Click **＋ Add stories** (or drop `.txt` files on the window). Multiple files at once are fine.
3. Press ▶. The first time, the voice model (~86 MB) downloads and is cached; after that it's fast.
   Generated audio is saved per story + voice, so re-listening is instant.

## Story file format
```
Title: Batteries Not Included
Description: I hate it when the batteries die.
URL: https://www.website.com/s/batteries-not-included-4
==================================================

Story text here onwards...
```
`Description` and `URL` are optional. A file with no header still works (file name becomes the title).
Re-uploading the same story (same URL, else same title) updates it instead of duplicating.
This is exactly what `scraping_scripts/*.py` already write.

## Notes
- Voice and engine are chosen in the header. **GPU (WebGPU)** is faster but a 326 MB download; it falls back to CPU if unavailable.
- Audio is generated up to ~10 min ahead of the playhead; "Generate all now" removes the cap.
- Seeking is limited to audio already generated. English voices only (what kokoro-js ships).
- If the model never loads, delete the two `cross_origin_*` keys in `manifest.json` (slower, single-threaded, but fewer moving parts).

## Rebuilding the speech engine (only needed to upgrade kokoro-js)
`vendor/` is prebuilt and committed. To rebuild: `npm install && npm run build`. `npm test` runs the unit tests.

## Dev
`index.html?engine=fake` swaps in a tone-babble engine (`scripts/dev/`) so UI work needs no model download.
