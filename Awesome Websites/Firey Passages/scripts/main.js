import { parseStoryFile, safeHttpUrl, decodeTextBytes, looksLikeText } from "./story-parser.js"
import { chunkText } from "./chunker.js"
import { listStories, getStory, upsertStory, deleteStory, audioSetId, loadAudioSet, saveAudioChunk } from "./library.js"
import { SegmentPlayer } from "./player.js"
import { TTSClient } from "./tts-client.js"
import { encodeWav, trimSilence } from "./wav.js"
import { VOICES, DEFAULT_VOICE } from "./voices.js"

// ---------- DOM ----------
const $ = (id) => document.getElementById(id)
const audio = $("audio")
const canvas = $("visualizer")
const ctx = canvas.getContext("2d")
const storySelect = $("storySelect")
const voiceSelect = $("voiceSelect")
const engineSelect = $("engineSelect")
const uploadBtn = $("uploadBtn")
const deleteBtn = $("deleteBtn")
const fileInput = $("fileInput")
const storyText = $("storyText")
const storyTitle = $("storyTitle")
const storyMeta = $("storyMeta")
const storyDesc = $("storyDesc")
const storyLink = $("storyLink")
const emptyState = $("emptyState")
const playPause = $("playPause")
const rewindBtn = $("rewind")
const timeDisplay = $("timeDisplay")
const seekBar = $("seekBar")
const muteBtn = $("mute")
const speedValue = $("speed-value")
const decSpeed = $("decrease-speed-btn")
const incSpeed = $("increase-speed-btn")
const fontInc = $("font-inc")
const fontDec = $("font-dec")
const ttsStatus = $("ttsStatus")
const ttsBar = $("ttsBar")
const ttsBarFill = $("ttsBarFill")
const genAllBtn = $("genAll")
const retryBtn = $("retryBtn")
const dropOverlay = $("dropOverlay")
const toastEl = $("toast")

// ---------- constants / prefs ----------
const QUERY = new URLSearchParams(location.search)
const IS_FAKE = QUERY.get("engine") === "fake" // dev/test engine, see scripts/dev/
// Generate at most this far ahead of the playhead (overridable only for the fake engine, for tests).
const LOOKAHEAD_SECONDS = IS_FAKE && QUERY.has("lookahead") ? Number(QUERY.get("lookahead")) : 600
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MODEL_MB = { wasm: 86, webgpu: 326 }

const store = {
  get(k, fallback) {
    try {
      return localStorage.getItem(`fp:${k}`) ?? fallback
    } catch {
      return fallback
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`fp:${k}`, v)
    } catch {}
  },
}
const prefs = {
  voice: store.get("voice", DEFAULT_VOICE),
  engine: store.get("engine", "wasm"),
}
if (!VOICES.some((v) => v.id === prefs.voice)) prefs.voice = DEFAULT_VOICE
if (!MODEL_MB[prefs.engine]) prefs.engine = "wasm"

const engineKey = () => `model:${prefs.engine}${IS_FAKE ? "-fake" : ""}`
const modelWasDownloaded = () => store.get(engineKey(), "") === "1"

// ---------- state ----------
const player = new SegmentPlayer(audio)
const tts = new TTSClient()
let stories = []
let current = null // story record on screen
let session = null // generation state for `current`
let openToken = 0
let modelProgress = null
let fontSize = 0.95
let audioCtx, analyser, dataArray

// ---------- helpers ----------
function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = s.toString().padStart(2, "0")
  return h ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`
}
const formatBytes = (b) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`)

let toastTimer
function toast(message, ms = 6000) {
  toastEl.textContent = message
  toastEl.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastEl.hidden = true), ms)
}

// ---------- audio visualizer ----------
function setupVisualizer() {
  if (audioCtx) return
  audioCtx = new AudioContext()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 64
  dataArray = new Uint8Array(analyser.frequencyBinCount)

  player.connectAnalyser(audioCtx, analyser)
  analyser.connect(audioCtx.destination)

  draw()
}

function draw() {
  requestAnimationFrame(draw)
  analyser.getByteFrequencyData(dataArray)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const barWidth = canvas.width / dataArray.length
  dataArray.forEach((value, index) => {
    ctx.fillStyle = `rgb(${value + 50}, 100, 200)`
    ctx.fillRect(index * barWidth, canvas.height - value * 0.5, barWidth - 2, value * 0.5)
  })
}

// ---------- library UI ----------
async function refreshLibrary() {
  stories = await listStories()
  storySelect.replaceChildren()
  if (!stories.length) {
    const o = new Option("No stories yet", "")
    o.disabled = true
    storySelect.append(o)
    storySelect.value = ""
  }
  for (const s of stories) {
    const o = new Option(s.title, s.id)
    if (s.description) o.title = s.description
    storySelect.append(o)
  }
  if (current) storySelect.value = current.id
  deleteBtn.disabled = !current
}

function populateVoices() {
  const groups = new Map()
  for (const v of VOICES) {
    const key = `${v.accent} ${v.gender}`
    if (!groups.has(key)) groups.set(key, document.createElement("optgroup"))
    const g = groups.get(key)
    g.label = key
    g.append(new Option(`${v.name} ${v.trait}`.trim() + ` (${v.grade})`, v.id))
  }
  voiceSelect.append(...groups.values())
  voiceSelect.value = prefs.voice
  engineSelect.value = prefs.engine
}

function showStory(story) {
  storyTitle.textContent = story.title
  storyDesc.textContent = story.description
  storyDesc.hidden = !story.description
  const href = safeHttpUrl(story.url)
  if (href) {
    storyLink.href = href
    storyLink.textContent = `Source: ${new URL(href).hostname} ↗`
  }
  storyLink.hidden = !href
  storyMeta.hidden = !story.description && !href
  storyText.textContent = story.text
  storyText.scrollTop = 0
  storyText.hidden = false
  emptyState.hidden = true
}

function showEmpty() {
  storyTitle.textContent = "No story yet"
  storyMeta.hidden = true
  storyText.hidden = true
  emptyState.hidden = false
  setStatus("")
  updateProgress()
}

// ---------- status line ----------
function setStatus(text, { retry = false, genAll = false, bar = null } = {}) {
  ttsStatus.textContent = text
  retryBtn.hidden = !retry
  genAllBtn.hidden = !genAll
  ttsBar.hidden = bar === null
  if (bar !== null) ttsBarFill.style.width = `${Math.round(bar * 100)}%`
}

function updateStatus() {
  const s = session
  if (!s) return setStatus("")
  if (s.error) return setStatus(`Couldn't generate audio: ${s.error}`, { retry: true })
  if (!s.chunks.length) return setStatus("This story has no readable text.")

  const skipped = s.skipped ? ` · ${s.skipped} passage${s.skipped > 1 ? "s" : ""} skipped` : ""
  if (s.loadingModel) {
    const p = modelProgress
    if (p?.total) {
      const frac = Math.min(1, p.loaded / p.total)
      return setStatus(
        `Downloading the voice model… ${Math.round(frac * 100)}% (first time only; it's kept on this device)`,
        { bar: frac },
      )
    }
    return setStatus("Loading the voice model…", { bar: 0 })
  }
  if (s.complete) {
    const where = s.cacheFailed ? "" : ` · ${formatBytes(s.cacheBytes)} saved on this device`
    return setStatus(`Audio ready · ${formatTime(player.generatedTotal)}${where}${skipped}`)
  }
  if (s.running && s.capped) {
    const ahead = formatTime(player.generatedTotal - player.currentTime)
    return setStatus(`${ahead} of audio generated ahead — pausing to save battery.`, { genAll: true })
  }
  if (s.running) {
    const rtf = s.wallMs > 0 ? ` · ${(s.audioSecs / (s.wallMs / 1000)).toFixed(1)}× realtime` : ""
    const buffering = player.state === "waiting" ? "Buffering… " : ""
    return setStatus(`${buffering}Generating audio… ${s.next}/${s.chunks.length}${rtf}${skipped}`)
  }
  if (s.next === 0 && !modelWasDownloaded()) {
    return setStatus(
      `Press ▶ to download the voice model (~${MODEL_MB[prefs.engine]} MB, first time only) and generate audio.`,
    )
  }
  return setStatus(`Press ▶ to ${s.next ? "continue generating" : "generate"} audio.${skipped}`)
}

// ---------- progress / seek bar ----------
function updateProgress() {
  const s = session
  const cur = player.currentTime
  const gen = player.generatedTotal
  const total = s?.complete ? gen : Math.max(gen, s?.estTotal ?? 0)
  const pct = (v) => (total > 0 ? `${Math.min(100, (v / total) * 100)}%` : "0%")

  seekBar.max = total
  seekBar.value = cur
  seekBar.style.setProperty("--progress", pct(cur))
  seekBar.style.setProperty("--buffered", pct(gen))
  const totalLabel = total > 0 ? `${s?.complete ? "" : "~"}${formatTime(total)}` : "--:--"
  timeDisplay.textContent = `${formatTime(cur)} / ${totalLabel}`

  // Let a capped generation loop continue once the playhead has caught up.
  if (s?.wake && (s.generateAll || gen - cur < LOOKAHEAD_SECONDS)) s.wake()
}

function updateEstimate() {
  const s = session
  if (!s) return
  if (s.complete) s.estTotal = player.generatedTotal
  else if (s.genChars > 0) {
    s.estTotal = player.generatedTotal + (s.totalChars - s.genChars) * (player.generatedTotal / s.genChars)
  } else s.estTotal = 0
}

player.addEventListener("timeupdate", updateProgress)
player.addEventListener("segments", updateProgress)
player.addEventListener("state", () => {
  if (player.state === "waiting" && session?.error) return player.pause() // buffered audio ran out; more isn't coming
  const active = player.state === "playing" || player.state === "waiting"
  playPause.textContent = active ? "⏸" : "▶"
  updateStatus()
})

// ---------- speech engine ----------
tts.addEventListener("progress", (e) => {
  modelProgress = e.detail
  updateStatus()
})
tts.addEventListener("info", (e) => toast(e.detail))

async function ensureEngine(s) {
  if (tts.isReady) return
  s.loadingModel = true
  modelProgress = null
  updateStatus()
  try {
    await tts.ensureReady(prefs.engine)
    store.set(engineKey(), "1")
  } finally {
    s.loadingModel = false
  }
}

function stopSession() {
  if (!session) return
  session.cancelled = true
  session.wake?.()
}

async function startGeneration(s) {
  if (s.running || s.complete || s.cancelled) return
  s.running = true
  s.error = null
  updateStatus()

  // Encodes, caches (even if the user has moved on, so the work isn't wasted)
  // and, if still current, hands one chunk to the player. `result === null`
  // commits a silent placeholder for a passage the voice couldn't read.
  const commit = async (index, result, wallMs) => {
    const chunk = s.chunks[index]
    const skipped = !result
    const samples = result ? trimSilence(result.samples, result.sampleRate) : new Float32Array(0)
    const { blob, duration } = encodeWav(samples, result?.sampleRate ?? 24000, skipped ? 0.5 : chunk.pause)
    let stored = blob
    try {
      stored = await saveAudioChunk({ setId: s.setId, storyId: s.story.id, index, blob, duration, skipped })
    } catch (err) {
      console.warn("Couldn't cache audio chunk:", err)
      s.cacheFailed = true
    }
    if (s.cancelled) return false
    s.next = index + 1
    s.genChars += chunk.text.length
    s.cacheBytes += blob.size
    if (skipped) s.skipped++
    else {
      s.real++
      s.audioSecs += duration
      s.wallMs += wallMs
    }
    player.addSegment(stored, duration)
    updateEstimate()
    updateStatus()
    return true
  }

  try {
    await ensureEngine(s)
    let cursor = s.next
    let attempts = 0
    let lastErr = null
    // Passages that failed. They're only committed (as silence) once a LATER
    // chunk succeeds, which shows the failure was specific to that passage
    // and not, say, being offline; otherwise nothing wrong gets cached.
    const pending = []

    while (cursor < s.chunks.length && !s.cancelled) {
      // Don't run the whole book through the CPU if nobody is listening yet.
      while (!s.cancelled && !s.generateAll && player.generatedTotal - player.currentTime >= LOOKAHEAD_SECONDS) {
        s.capped = true
        updateStatus()
        await new Promise((resolve) => (s.wake = resolve))
        s.wake = null
      }
      s.capped = false
      if (s.cancelled) return

      const t0 = performance.now()
      let result
      try {
        result = await tts.generate(s.chunks[cursor].text, s.voice)
      } catch (err) {
        if (err.name === "AbortError" || s.cancelled) return
        console.warn(`Chunk ${cursor} failed:`, err)
        lastErr = err
        if (++attempts < 3) continue // retry the same chunk
        attempts = 0
        pending.push(cursor++)
        if (pending.length >= 5) throw lastErr // looks systemic, stop and say so
        continue
      }
      attempts = 0
      const wallMs = performance.now() - t0
      for (const idx of pending.splice(0)) if (!(await commit(idx, null, 0))) return
      if (!(await commit(cursor, result, wallMs))) return
      cursor++
    }

    if (s.cancelled) return
    if (pending.length) {
      if (s.real === 0) throw lastErr // nothing at all could be read: don't cache silence
      for (const idx of pending.splice(0)) if (!(await commit(idx, null, 0))) return
    }
    s.complete = true
    player.markFinished()
    updateEstimate()
  } catch (err) {
    if (!s.cancelled && err.name !== "AbortError") {
      console.error(err)
      s.error = err.message || String(err)
      if (player.state === "waiting") player.pause() // nothing left to wait for
    }
  } finally {
    s.running = false
    if (session === s) {
      updateStatus()
      updateProgress()
    }
  }
}

function ensureGeneration() {
  if (!session || session.complete || session.running) return
  session.error = null
  startGeneration(session)
}

// ---------- opening a story ----------
async function openStory(id) {
  const token = ++openToken
  stopSession()
  session = null
  player.reset()
  updateProgress()

  const story = await getStory(id)
  if (token !== openToken) return
  if (!story) {
    current = null
    await refreshLibrary()
    return stories.length ? openStory(stories[0].id) : showEmpty()
  }

  current = story
  store.set("lastStory", story.id)
  storySelect.value = story.id
  deleteBtn.disabled = false
  showStory(story)

  const chunks = chunkText(story.text)
  const s = (session = {
    story,
    chunks,
    voice: prefs.voice,
    setId: audioSetId(story, prefs.voice),
    totalChars: chunks.reduce((n, c) => n + c.text.length, 0),
    next: 0,
    genChars: 0,
    audioSecs: 0,
    wallMs: 0,
    cacheBytes: 0,
    skipped: 0,
    real: 0, // chunks that were actually spoken (not silent placeholders)
    estTotal: 0,
    running: false,
    complete: false,
    cancelled: false,
    capped: false,
    generateAll: false,
    loadingModel: false,
    cacheFailed: false,
    error: null,
    wake: null,
  })
  if (!chunks.length) return updateStatus()

  let cached = []
  try {
    cached = await loadAudioSet(s.setId)
  } catch (err) {
    console.warn("Couldn't read cached audio:", err)
  }
  if (token !== openToken) return

  for (const c of cached) {
    const chars = s.chunks[c.index]?.text.length ?? 0
    s.next++
    s.genChars += chars
    s.cacheBytes += c.bytes
    if (c.skipped) s.skipped++
    else {
      s.real++
      s.audioSecs += c.duration
    }
    player.addSegment(c.blob, c.duration)
  }
  if (s.next >= chunks.length) {
    s.complete = true
    player.markFinished()
  }
  updateEstimate()
  updateStatus()
  updateProgress()

  // If the model was downloaded before, get a head start so ▶ is instant.
  if (!s.complete && modelWasDownloaded()) startGeneration(s)
}

// ---------- adding stories ----------
async function handleFiles(fileList) {
  const all = [...fileList]
  const files = all.filter((f) => /\.txt$/i.test(f.name) || f.type.startsWith("text/"))
  const problems = all.filter((f) => !files.includes(f)).map((f) => `${f.name}: not a .txt file`)
  const counts = { added: 0, updated: 0, unchanged: 0 }
  let firstId = null

  for (const file of files) {
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("larger than 10 MB")
      const text = decodeTextBytes(await file.arrayBuffer())
      if (!looksLikeText(text)) throw new Error("doesn't look like text")
      const parsed = parseStoryFile(text, file.name)
      if (!parsed.text.trim()) throw new Error("no story text found")
      const { story, status } = await upsertStory(parsed)
      counts[status]++
      firstId ??= story.id
    } catch (err) {
      problems.push(`${file.name}: ${err.message || err}`)
    }
  }

  const parts = []
  if (counts.added) parts.push(`Added ${counts.added}`)
  if (counts.updated) parts.push(`Updated ${counts.updated}`)
  if (counts.unchanged) parts.push(`${counts.unchanged} already in your library`)
  const lines = [parts.join(" · ")].filter(Boolean)
  if (problems.length) lines.push(`Couldn't add:\n${problems.join("\n")}`)
  if (lines.length) toast(lines.join("\n"), problems.length ? 10000 : 5000)

  await refreshLibrary()
  if (firstId) await openStory(firstId)
}

uploadBtn.onclick = () => fileInput.click()
fileInput.onchange = async () => {
  const files = [...fileInput.files]
  fileInput.value = "" // allow re-selecting the same file
  if (files.length) await handleFiles(files)
}

let dragDepth = 0
const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files")
window.addEventListener("dragenter", (e) => {
  if (!hasFiles(e)) return
  dragDepth++
  dropOverlay.hidden = false
})
window.addEventListener("dragleave", (e) => {
  if (!hasFiles(e)) return
  if (--dragDepth <= 0) {
    dragDepth = 0
    dropOverlay.hidden = true
  }
})
window.addEventListener("dragover", (e) => hasFiles(e) && e.preventDefault())
window.addEventListener("drop", (e) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth = 0
  dropOverlay.hidden = true
  handleFiles(e.dataTransfer.files)
})

deleteBtn.onclick = async () => {
  if (!current) return
  if (!confirm(`Delete “${current.title}” and its saved audio?`)) return
  const index = stories.findIndex((s) => s.id === current.id)
  const id = current.id
  stopSession()
  openToken++
  player.reset()
  session = null
  current = null
  await deleteStory(id)
  await refreshLibrary()
  if (stories.length) await openStory(stories[Math.min(index, stories.length - 1)].id)
  else showEmpty()
}

storySelect.onchange = (e) => e.target.value && openStory(e.target.value)

voiceSelect.onchange = () => {
  prefs.voice = voiceSelect.value
  store.set("voice", prefs.voice)
  if (current) openStory(current.id) // different voice = different audio set
}

engineSelect.onchange = () => {
  prefs.engine = engineSelect.value
  store.set("engine", prefs.engine)
  tts.dispose()
  if (current) openStory(current.id)
}

genAllBtn.onclick = () => {
  if (!session) return
  session.generateAll = true
  session.capped = false
  session.wake?.()
  updateStatus()
}
retryBtn.onclick = () => {
  if (session) {
    session.error = null
    ensureGeneration()
  }
}

// ---------- playback controls ----------
playPause.onclick = async () => {
  if (!current) return
  if (!audioCtx) setupVisualizer()
  await audioCtx.resume()

  if (player.state === "playing" || player.state === "waiting") {
    player.pause()
  } else {
    player.play()
    ensureGeneration()
  }
}

rewindBtn.onclick = () => player.seek(player.currentTime - 10)

muteBtn.onclick = () => {
  player.setMuted(!player.muted)
  muteBtn.textContent = player.muted ? "🔇" : "🔊"
}

seekBar.oninput = () => player.seek(Number(seekBar.value))

// Speed controls
function setSpeed(value) {
  player.setRate(value)
  speedValue.textContent = player.rate.toFixed(2)
}
function updateSpeed(delta) {
  setSpeed(Math.min(2, Math.max(0.5, Math.round((player.rate + delta) * 10) / 10)))
}
decSpeed.onclick = () => updateSpeed(-0.1)
incSpeed.onclick = () => updateSpeed(0.1)

// Font size controls
fontInc.onclick = () => {
  fontSize = Math.min(1.5, fontSize + 0.1)
  storyText.style.fontSize = `${fontSize}rem`
}
fontDec.onclick = () => {
  fontSize = Math.max(0.75, fontSize - 0.1)
  storyText.style.fontSize = `${fontSize}rem`
}

// ---------- Horizontal to Vertical Scroll Remapper ----------
function findScrollableParent(element) {
  while (element && element !== document.body) {
    const overflowY = getComputedStyle(element).overflowY
    if ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight) {
      return element
    }
    element = element.parentElement
  }
  return null
}

window.addEventListener(
  "wheel",
  (e) => {
    // Only remap horizontal scrolling
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (!target) return

    const scrollable = findScrollableParent(target)
    e.preventDefault()

    if (scrollable) scrollable.scrollTop += e.deltaX
    else window.scrollBy({ top: e.deltaX, left: 0, behavior: "auto" })
  },
  { passive: false },
)

// ---------- Keyboard Shortcuts ----------
window.addEventListener("keydown", (e) => {
  // Ignore typing inside inputs / selects, and browser/extension shortcuts (Ctrl+R, Alt+E…)
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return
  if (e.ctrlKey || e.metaKey || e.altKey) return

  switch (e.key.toLowerCase()) {
    case " ":
      e.preventDefault()
      playPause.click()
      break
    case "arrowleft":
      player.seek(player.currentTime - 10)
      break
    case "arrowright":
      player.seek(player.currentTime + 10)
      break
    case "a":
      setSpeed(1)
      break
    case "q":
      setSpeed(1.5)
      break
    case "w":
      setSpeed(2)
      break
    case "e":
      setSpeed(2.5)
      break
    case "r":
      setSpeed(3)
      break
    case "t":
      setSpeed(4)
      break
  }
})

// ---------- boot ----------
async function boot() {
  populateVoices()
  await refreshLibrary()
  updateProgress()
  const last = store.get("lastStory", "")
  const start = stories.find((s) => s.id === last) ?? stories[0]
  if (start) await openStory(start.id)
  else showEmpty()
}

if (IS_FAKE || QUERY.has("debug")) window.__fp = { player, tts, prefs, get session() { return session }, get current() { return current } }

boot().catch((err) => {
  console.error(err)
  setStatus(`Couldn't open the story library: ${err.message || err}`)
})
