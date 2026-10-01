import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from './components/Header.jsx'
import { StoryView } from './components/StoryView.jsx'
import { AudioPanel } from './components/AudioPanel.jsx'
import { GradientPanel } from './components/GradientPanel.jsx'
import { DropOverlay } from './components/DropOverlay.jsx'
import { Toast } from './components/Toast.jsx'

import { parseStoryFile, decodeTextBytes, looksLikeText } from './lib/story-parser.js'
import { chunkText } from './lib/chunker.js'
import {
  listStories,
  getStory,
  upsertStory,
  deleteStory,
  audioSetId,
  loadAudioSet,
  saveAudioChunk,
} from './lib/library.js'
import { SegmentPlayer } from './lib/player.js'
import { TTSClient } from './lib/tts-client.js'
import { encodeWav, trimSilence } from './lib/wav.js'
import { VOICES, DEFAULT_VOICE } from './lib/voices.js'

const QUERY = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const IS_FAKE = QUERY.get('engine') === 'fake'
const LOOKAHEAD_SECONDS = IS_FAKE && QUERY.has('lookahead') ? Number(QUERY.get('lookahead')) : 600
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

function formatBytes(b) {
  return b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = s.toString().padStart(2, '0')
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function App() {
  const [stories, setStories] = useState([])
  const [currentStory, setCurrentStory] = useState(null)
  const [fontSize, setFontSize] = useState(0.95)

  // Preferences
  const [voice, setVoice] = useState(() => {
    const saved = store.get('voice', DEFAULT_VOICE)
    return VOICES.some((v) => v.id === saved) ? saved : DEFAULT_VOICE
  })
  const [engine, setEngine] = useState(() => {
    const saved = store.get('engine', 'wasm')
    return MODEL_MB[saved] ? saved : 'wasm'
  })

  // Playback state
  const [playerState, setPlayerState] = useState('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [generatedTotal, setGeneratedTotal] = useState(0)
  const [estimatedTotal, setEstimatedTotal] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)

  // Status & TTS
  const [statusText, setStatusText] = useState('')
  const [statusProgress, setStatusProgress] = useState(null)
  const [canGenAll, setCanGenAll] = useState(false)
  const [canRetry, setCanRetry] = useState(false)

  // UI state
  const [toastMessage, setToastMessage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Refs
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)
  const playerRef = useRef(null)
  const ttsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)

  const sessionRef = useRef(null)
  const openTokenRef = useRef(0)
  const modelProgressRef = useRef(null)
  const toastTimerRef = useRef(null)
  const dragDepthRef = useRef(0)

  const engineKey = useCallback((eng = engine) => `model:${eng}${IS_FAKE ? '-fake' : ''}`, [engine])
  const modelWasDownloaded = useCallback((eng = engine) => store.get(engineKey(eng), '') === '1', [engineKey, engine])

  const showToast = useCallback((msg, ms = 6000) => {
    setToastMessage(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), ms)
  }, [])

  // Update status row display based on session & player
  const updateStatusUI = useCallback(() => {
    const s = sessionRef.current
    const p = playerRef.current
    if (!s) {
      setStatusText('')
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    if (s.error) {
      setStatusText(`Couldn't generate audio: ${s.error}`)
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(true)
      return
    }

    if (!s.chunks.length) {
      setStatusText('This story has no readable text.')
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    const skipped = s.skipped ? ` · ${s.skipped} passage${s.skipped > 1 ? 's' : ''} skipped` : ''

    if (s.loadingModel) {
      const prog = modelProgressRef.current
      if (prog?.total) {
        const frac = Math.min(1, prog.loaded / prog.total)
        setStatusText(`Downloading voice model… ${Math.round(frac * 100)}% (first time only; saved on device)`)
        setStatusProgress(frac)
      } else {
        setStatusText('Loading voice model…')
        setStatusProgress(0)
      }
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    if (s.complete) {
      const where = s.cacheFailed ? '' : ` · ${formatBytes(s.cacheBytes)} saved on this device`
      const dur = p ? formatTime(p.generatedTotal) : '0:00'
      setStatusText(`Audio ready · ${dur}${where}${skipped}`)
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    if (s.running && s.capped) {
      const ahead = p ? formatTime(p.generatedTotal - p.currentTime) : '0:00'
      setStatusText(`${ahead} of audio generated ahead — paused to save battery.`)
      setStatusProgress(null)
      setCanGenAll(true)
      setCanRetry(false)
      return
    }

    if (s.running) {
      const rtf = s.wallMs > 0 ? ` · ${(s.audioSecs / (s.wallMs / 1000)).toFixed(1)}× realtime` : ''
      const buffering = p && p.state === 'waiting' ? 'Buffering… ' : ''
      setStatusText(`${buffering}Generating audio… ${s.next}/${s.chunks.length}${rtf}${skipped}`)
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    if (s.next === 0 && !modelWasDownloaded()) {
      setStatusText(`Press ▶ to download voice model (~${MODEL_MB[engine] || 86} MB, first time only) and generate audio.`)
      setStatusProgress(null)
      setCanGenAll(false)
      setCanRetry(false)
      return
    }

    setStatusText(`Press ▶ to ${s.next ? 'continue generating' : 'generate'} audio.${skipped}`)
    setStatusProgress(null)
    setCanGenAll(false)
    setCanRetry(false)
  }, [engine, modelWasDownloaded])

  const updateProgressUI = useCallback(() => {
    const p = playerRef.current
    const s = sessionRef.current
    if (!p) return

    const cur = p.currentTime
    const gen = p.generatedTotal
    setCurrentTime(cur)
    setGeneratedTotal(gen)

    const est = s?.complete ? gen : Math.max(gen, s?.estTotal ?? 0)
    setEstimatedTotal(est)

    // Wake capped generation loop when player catches up
    if (s?.wake && (s.generateAll || gen - cur < LOOKAHEAD_SECONDS)) {
      s.wake()
    }
  }, [])

  const updateEstimate = useCallback(() => {
    const s = sessionRef.current
    const p = playerRef.current
    if (!s || !p) return
    if (s.complete) {
      s.estTotal = p.generatedTotal
    } else if (s.genChars > 0) {
      s.estTotal = p.generatedTotal + (s.totalChars - s.genChars) * (p.generatedTotal / s.genChars)
    } else {
      s.estTotal = 0
    }
    setEstimatedTotal(s.estTotal)
  }, [])

  // Web Audio visualizer setup
  const setupVisualizer = useCallback(() => {
    if (audioCtxRef.current) return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    audioCtxRef.current = ctx
    analyserRef.current = analyser

    if (playerRef.current) {
      playerRef.current.connectAnalyser(ctx, analyser)
    }
    analyser.connect(ctx.destination)
  }, [])

  const stopSession = useCallback(() => {
    if (!sessionRef.current) return
    sessionRef.current.cancelled = true
    sessionRef.current.wake?.()
  }, [])

  const ensureEngine = useCallback(async (s) => {
    const tts = ttsRef.current
    if (!tts || tts.isReady) return
    s.loadingModel = true
    modelProgressRef.current = null
    updateStatusUI()
    try {
      await tts.ensureReady(engine)
      store.set(engineKey(engine), '1')
    } finally {
      s.loadingModel = false
      updateStatusUI()
    }
  }, [engine, engineKey, updateStatusUI])

  // Generation loop
  const startGeneration = useCallback(async (s) => {
    const p = playerRef.current
    const tts = ttsRef.current
    if (!s || s.running || s.complete || s.cancelled || !p || !tts) return
    s.running = true
    s.error = null
    updateStatusUI()

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
      p.addSegment(stored, duration)
      updateEstimate()
      updateStatusUI()
      updateProgressUI()
      return true
    }

    try {
      await ensureEngine(s)
      let cursor = s.next
      let attempts = 0
      let lastErr = null
      const pending = []

      while (cursor < s.chunks.length && !s.cancelled) {
        while (!s.cancelled && !s.generateAll && p.generatedTotal - p.currentTime >= LOOKAHEAD_SECONDS) {
          s.capped = true
          updateStatusUI()
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
          if (err.name === 'AbortError' || s.cancelled) return
          console.warn(`Chunk ${cursor} failed:`, err)
          lastErr = err
          if (++attempts < 3) continue
          attempts = 0
          pending.push(cursor++)
          if (pending.length >= 5) throw lastErr
          continue
        }
        attempts = 0
        const wallMs = performance.now() - t0
        for (const idx of pending.splice(0)) {
          if (!(await commit(idx, null, 0))) return
        }
        if (!(await commit(cursor, result, wallMs))) return
        cursor++
      }

      if (s.cancelled) return
      if (pending.length) {
        if (s.real === 0) throw lastErr
        for (const idx of pending.splice(0)) {
          if (!(await commit(idx, null, 0))) return
        }
      }
      s.complete = true
      p.markFinished()
      updateEstimate()
    } catch (err) {
      if (!s.cancelled && err.name !== 'AbortError') {
        console.error(err)
        s.error = err.message || String(err)
        if (p.state === 'waiting') p.pause()
      }
    } finally {
      s.running = false
      if (sessionRef.current === s) {
        updateStatusUI()
        updateProgressUI()
      }
    }
  }, [ensureEngine, updateEstimate, updateProgressUI, updateStatusUI])

  const ensureGeneration = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.complete || s.running) return
    s.error = null
    startGeneration(s)
  }, [startGeneration])

  // Open story handler
  const openStory = useCallback(async (id, voiceOverride) => {
    const token = ++openTokenRef.current
    const p = playerRef.current
    stopSession()
    sessionRef.current = null
    if (p) p.reset()
    updateProgressUI()

    const story = await getStory(id)
    if (token !== openTokenRef.current) return
    if (!story) {
      setCurrentStory(null)
      const list = await listStories()
      setStories(list)
      return list.length ? openStory(list[0].id) : null
    }

    setCurrentStory(story)
    store.set('lastStory', story.id)

    const activeVoice = voiceOverride || voice
    const chunks = chunkText(story.text)
    const s = {
      story,
      chunks,
      voice: activeVoice,
      setId: audioSetId(story, activeVoice),
      totalChars: chunks.reduce((n, c) => n + c.text.length, 0),
      next: 0,
      genChars: 0,
      audioSecs: 0,
      wallMs: 0,
      cacheBytes: 0,
      skipped: 0,
      real: 0,
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
    }
    sessionRef.current = s

    if (!chunks.length) {
      updateStatusUI()
      return
    }

    let cached = []
    try {
      cached = await loadAudioSet(s.setId)
    } catch (err) {
      console.warn("Couldn't read cached audio:", err)
    }
    if (token !== openTokenRef.current) return

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
      p.addSegment(c.blob, c.duration)
    }

    // A fullAudio chunk means the whole story was imported as a pre-generated file
    // so we skip TTS generation entirely and mark the session complete immediately.
    const hasFullAudio = cached.length > 0 && cached[0].fullAudio
    if (s.next >= chunks.length || hasFullAudio) {
      s.complete = true
      p.markFinished()
    }

    updateEstimate()
    updateStatusUI()
    updateProgressUI()

    // If model was previously downloaded, start generating immediately
    if (!s.complete && modelWasDownloaded()) {
      startGeneration(s)
    }
  }, [modelWasDownloaded, startGeneration, stopSession, updateEstimate, updateProgressUI, updateStatusUI, voice])

  // Initialize player and TTS on mount
  useEffect(() => {
    if (!audioRef.current) return
    const p = new SegmentPlayer(audioRef.current)
    playerRef.current = p

    const tts = new TTSClient()
    ttsRef.current = tts

    p.addEventListener('timeupdate', updateProgressUI)
    p.addEventListener('segments', updateProgressUI)
    p.addEventListener('state', () => {
      setPlayerState(p.state)
      if (p.state === 'waiting' && sessionRef.current?.error) {
        p.pause()
      }
      updateStatusUI()
    })

    tts.addEventListener('progress', (e) => {
      modelProgressRef.current = e.detail
      updateStatusUI()
    })
    tts.addEventListener('info', (e) => showToast(e.detail))

    // Expose debug handle
    if (IS_FAKE || QUERY.has('debug')) {
      window.__fp = {
        player: p,
        tts,
        get session() { return sessionRef.current },
        get current() { return currentStory },
      }
    }

    // Initial load
    async function boot() {
      const all = await listStories()
      setStories(all)
      const last = store.get('lastStory', '')
      const start = all.find((s) => s.id === last) ?? all[0]
      if (start) {
        await openStory(start.id)
      } else {
        updateStatusUI()
      }
    }

    boot().catch((err) => {
      console.error(err)
      showToast(`Couldn't open story library: ${err.message || err}`)
    })

    return () => {
      p.reset()
      tts.dispose()
    }
  }, [])

  // File uploading & parsing
  const handleFiles = useCallback(async (fileList) => {
    const all = Array.from(fileList)
    const txtFiles = all.filter((f) => /\.txt$/i.test(f.name) || f.type.startsWith('text/'))
    const audioFiles = all.filter((f) => /\.(wav|mp3|ogg|m4a|aac|flac)$/i.test(f.name) || f.type.startsWith('audio/'))
    const unknownFiles = all.filter((f) => !txtFiles.includes(f) && !audioFiles.includes(f))
    const problems = unknownFiles.map((f) => `${f.name}: not a .txt or audio file`)
    const counts = { added: 0, updated: 0, unchanged: 0 }
    let firstId = null

    // 1. Process .txt files first so stories exist before audio is matched
    const storyMap = new Map() // stem -> story
    for (const file of txtFiles) {
      try {
        if (file.size > MAX_FILE_BYTES) throw new Error('larger than 10 MB')
        const text = decodeTextBytes(await file.arrayBuffer())
        if (!looksLikeText(text)) throw new Error("doesn't look like text")
        const parsed = parseStoryFile(text, file.name)
        if (!parsed.text.trim()) throw new Error('no story text found')
        const { story, status } = await upsertStory(parsed)
        counts[status]++
        firstId ??= story.id
        const stem = file.name.replace(/\.txt$/i, '').toLowerCase()
        storyMap.set(stem, story)
      } catch (err) {
        problems.push(`${file.name}: ${err.message || err}`)
      }
    }

    // 2. Process audio files: match by filename stem to a loaded story,
    //    or to the currently selected story if no stem match.
    for (const file of audioFiles) {
      try {
        const stem = file.name.replace(/\.(wav|mp3|ogg|m4a|aac|flac)$/i, '').toLowerCase()
        const story = storyMap.get(stem) ?? currentStory
        if (!story) {
          problems.push(`${file.name}: no matching story found (upload the .txt file first)`)
          continue
        }

        // Read the audio into a blob and probe its duration
        const arrayBuf = await file.arrayBuffer()
        const audioBlob = new Blob([arrayBuf], { type: file.type || 'audio/wav' })
        const duration = await new Promise((resolve) => {
          const url = URL.createObjectURL(audioBlob)
          const a = new Audio()
          a.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(a.duration || 0) }
          a.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
          a.src = url
        })

        // Store as chunk 0 of the pre-baked audio set keyed for this voice
        const activeVoice = voice
        const setId = audioSetId(story, activeVoice)
        await saveAudioChunk({ setId, storyId: story.id, index: 0, blob: audioBlob, duration, fullAudio: true })
        showToast(`Audio loaded for "${story.title}" (${Math.round(duration)}s)`, 5000)
        firstId ??= story.id
      } catch (err) {
        problems.push(`${file.name}: ${err.message || err}`)
      }
    }

    const parts = []
    if (counts.added) parts.push(`Added ${counts.added}`)
    if (counts.updated) parts.push(`Updated ${counts.updated}`)
    if (counts.unchanged) parts.push(`${counts.unchanged} already in library`)
    const lines = [parts.join(' · ')].filter(Boolean)
    if (problems.length) lines.push(`Couldn't add:\n${problems.join('\n')}`)
    if (lines.length) showToast(lines.join('\n'), problems.length ? 10000 : 5000)

    const updatedList = await listStories()
    setStories(updatedList)
    if (firstId) await openStory(firstId)
  }, [currentStory, openStory, showToast, voice])

  const handleDeleteStory = useCallback(async () => {
    if (!currentStory) return
    if (!window.confirm(`Delete “${currentStory.title}” and its saved audio?`)) return
    const id = currentStory.id
    const index = stories.findIndex((s) => s.id === id)

    stopSession()
    openTokenRef.current++
    if (playerRef.current) playerRef.current.reset()
    sessionRef.current = null
    setCurrentStory(null)

    await deleteStory(id)
    const updated = await listStories()
    setStories(updated)

    if (updated.length) {
      await openStory(updated[Math.min(index, updated.length - 1)].id)
    } else {
      updateStatusUI()
    }
  }, [currentStory, openStory, stopSession, stories, updateStatusUI])

  // Transport handlers
  const handlePlayPause = useCallback(async () => {
    if (!currentStory) return
    if (!audioCtxRef.current) setupVisualizer()
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume()
    }

    const p = playerRef.current
    if (!p) return

    if (p.state === 'playing' || p.state === 'waiting') {
      p.pause()
    } else {
      p.play()
      ensureGeneration()
    }
  }, [currentStory, ensureGeneration, setupVisualizer])

  const handleRewind = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.seek(playerRef.current.currentTime - 10)
    }
  }, [])

  const handleSeek = useCallback((time) => {
    if (playerRef.current) {
      playerRef.current.seek(time)
    }
  }, [])

  const handleToggleMute = useCallback(() => {
    if (playerRef.current) {
      const next = !playerRef.current.muted
      playerRef.current.setMuted(next)
      setIsMuted(next)
    }
  }, [])

  const handleSetSpeed = useCallback((rate) => {
    if (playerRef.current) {
      playerRef.current.setRate(rate)
      setPlaybackRate(playerRef.current.rate)
    }
  }, [])

  const handleUpdateSpeed = useCallback((delta) => {
    if (playerRef.current) {
      const target = Math.min(2, Math.max(0.5, Math.round((playerRef.current.rate + delta) * 10) / 10))
      handleSetSpeed(target)
    }
  }, [handleSetSpeed])

  // Preference change handlers
  const handleSelectVoice = useCallback((v) => {
    setVoice(v)
    store.set('voice', v)
    if (currentStory) {
      openStory(currentStory.id, v)
    }
  }, [currentStory, openStory])

  const handleSelectEngine = useCallback((eng) => {
    setEngine(eng)
    store.set('engine', eng)
    if (ttsRef.current) ttsRef.current.dispose()
    if (currentStory) {
      openStory(currentStory.id)
    }
  }, [currentStory, openStory])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'arrowleft':
          playerRef.current?.seek(playerRef.current.currentTime - 10)
          break
        case 'arrowright':
          playerRef.current?.seek(playerRef.current.currentTime + 10)
          break
        case 'm':
          handleToggleMute()
          break
        case 'a':
          handleSetSpeed(1)
          break
        case 'q':
          handleSetSpeed(1.5)
          break
        case 'w':
          handleSetSpeed(2)
          break
        case 'e':
          handleSetSpeed(2.5)
          break
        case 'r':
          handleSetSpeed(3)
          break
        case 't':
          handleSetSpeed(4)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayPause, handleSetSpeed, handleToggleMute])

  // Drag and Drop
  useEffect(() => {
    const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (e) => {
      if (!hasFiles(e)) return
      dragDepthRef.current++
      setIsDragging(true)
    }
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return
      if (--dragDepthRef.current <= 0) {
        dragDepthRef.current = 0
        setIsDragging(false)
      }
    }
    const onDragOver = (e) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files)
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleFiles])

  return (
    <>
      <Header
        stories={stories}
        currentStory={currentStory}
        onSelectStory={(id) => openStory(id)}
        onUploadClick={() => fileInputRef.current?.click()}
        onDeleteStory={handleDeleteStory}
        selectedVoice={voice}
        onSelectVoice={handleSelectVoice}
        selectedEngine={engine}
        onSelectEngine={handleSelectEngine}
        fileInputRef={fileInputRef}
        onFileChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files)
            e.target.value = ''
          }
        }}
      />

      <main className="app-main">
        <StoryView
          currentStory={currentStory}
          fontSize={fontSize}
          onIncreaseFont={() => setFontSize((f) => Math.min(1.5, f + 0.1))}
          onDecreaseFont={() => setFontSize((f) => Math.max(0.75, f - 0.1))}
        />

        <div className="right-column">
          <AudioPanel
            audioRef={audioRef}
            analyserRef={analyserRef}
            playerState={playerState}
            currentTime={currentTime}
            generatedTotal={generatedTotal}
            estimatedTotal={estimatedTotal}
            isMuted={isMuted}
            playbackRate={playbackRate}
            onPlayPause={handlePlayPause}
            onRewind={handleRewind}
            onSeek={handleSeek}
            onToggleMute={handleToggleMute}
            onUpdateSpeed={handleUpdateSpeed}
            statusText={statusText}
            statusProgress={statusProgress}
            canGenAll={canGenAll}
            onGenAll={() => {
              if (sessionRef.current) {
                sessionRef.current.generateAll = true
                sessionRef.current.capped = false
                sessionRef.current.wake?.()
                updateStatusUI()
              }
            }}
            canRetry={canRetry}
            onRetry={() => {
              if (sessionRef.current) {
                sessionRef.current.error = null
                ensureGeneration()
              }
            }}
          />

          <GradientPanel />
        </div>
      </main>

      <footer className="app-footer">
        Speech is generated on your device (Kokoro) • Fine-grained playback speed • Audio saved locally
      </footer>

      <DropOverlay isVisible={isDragging} />
      <Toast message={toastMessage} />
    </>
  )
}
export default App
