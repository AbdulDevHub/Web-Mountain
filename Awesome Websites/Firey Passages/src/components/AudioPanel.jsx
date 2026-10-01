import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Activity,
  Maximize2,
  Minimize2,
  Headphones,
  Flame,
} from 'lucide-react'
import { assetUrl } from '../lib/assets'

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = s.toString().padStart(2, '0')
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function AudioPanel({
  audioRef,
  analyserRef,
  playerState,
  currentTime,
  generatedTotal,
  estimatedTotal,
  isMuted,
  playbackRate,
  onPlayPause,
  onRewind,
  onSeek,
  onToggleMute,
  onUpdateSpeed,
  statusText,
  statusProgress, // number 0..1 or null
  canGenAll,
  onGenAll,
  canRetry,
  onRetry,
}) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const stageRef = useRef(null)
  const brownNoiseRef = useRef(null)
  const cozyCottageRef = useRef(null)
  const hudTimerRef = useRef(null)

  // Visual modes: 'waveform' | 'brown-noise' | 'cozy-cottage'
  const [visualMode, setVisualMode] = useState(() => {
    try {
      return localStorage.getItem('fp:visualMode') || 'waveform'
    } catch {
      return 'waveform'
    }
  })

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHud, setShowHud] = useState(true)

  // Ambient sound for videos
  const [ambientMuted, setAmbientMuted] = useState(() => {
    try {
      return localStorage.getItem('fp:ambientMuted') !== 'false'
    } catch {
      return true
    }
  })
  const [ambientVolume, setAmbientVolume] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('fp:ambientVolume') || '0.35')
      return isNaN(v) ? 0.35 : Math.max(0, Math.min(1, v))
    } catch {
      return 0.35
    }
  })

  // Toggle Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement && document.fullscreenElement === stageRef.current
      setIsFullscreen(isFs)
      setShowHud(true)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Keyboard shortcut 'f' for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen])

  // Mouse move HUD auto-hide in fullscreen mode
  const handleMouseMove = useCallback(() => {
    if (!isFullscreen) return
    setShowHud(true)
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current)
    hudTimerRef.current = setTimeout(() => {
      setShowHud(false)
    }, 2500)
  }, [isFullscreen])

  // Video playback synchronization when switching visual mode
  useEffect(() => {
    try {
      localStorage.setItem('fp:visualMode', visualMode)
    } catch {}

    if (visualMode === 'brown-noise') {
      if (brownNoiseRef.current) {
        brownNoiseRef.current.currentTime = brownNoiseRef.current.currentTime || 0
        brownNoiseRef.current.play().catch(() => {})
      }
      cozyCottageRef.current?.pause()
    } else if (visualMode === 'cozy-cottage') {
      if (cozyCottageRef.current) {
        cozyCottageRef.current.currentTime = cozyCottageRef.current.currentTime || 0
        cozyCottageRef.current.play().catch(() => {})
      }
      brownNoiseRef.current?.pause()
    } else {
      brownNoiseRef.current?.pause()
      cozyCottageRef.current?.pause()
    }
  }, [visualMode])

  // Ambient sound volume & mute synchronization
  useEffect(() => {
    try {
      localStorage.setItem('fp:ambientMuted', String(ambientMuted))
      localStorage.setItem('fp:ambientVolume', String(ambientVolume))
    } catch {}

    if (brownNoiseRef.current) {
      brownNoiseRef.current.muted = ambientMuted
      brownNoiseRef.current.volume = ambientVolume
    }
    if (cozyCottageRef.current) {
      cozyCottageRef.current.muted = ambientMuted
      cozyCottageRef.current.volume = ambientVolume
    }
  }, [ambientMuted, ambientVolume])

  // Smooth video loop fallback
  const handleVideoEnded = (e) => {
    e.currentTarget.currentTime = 0
    e.currentTarget.play().catch(() => {})
  }

  // Draw visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let active = true

    const draw = () => {
      if (!active) return
      animFrameRef.current = requestAnimationFrame(draw)

      // Only draw when waveform mode is visible to save GPU/CPU
      if (visualMode !== 'waveform') return

      // Handle high-DPI scaling
      const width = canvas.clientWidth || 300
      const height = canvas.clientHeight || 200
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      ctx.clearRect(0, 0, width, height)

      const analyser = analyserRef.current
      if (analyser && (playerState === 'playing' || playerState === 'waiting')) {
        const binCount = analyser.frequencyBinCount || 0
        if (binCount > 0 && isFinite(height) && height > 0) {
          const dataArray = new Uint8Array(binCount)
          analyser.getByteFrequencyData(dataArray)

          const barCount = 36
          const step = Math.max(1, Math.floor(binCount / barCount))
          const barWidth = width / barCount

          for (let i = 0; i < barCount; i++) {
            let sum = 0
            for (let j = 0; j < step; j++) {
              sum += dataArray[i * step + j] || 0
            }
            const val = step > 0 ? sum / step : 0
            const barHeight = Math.max(2, isFinite(val) ? (val / 255) * height * 0.88 : 2)
            const topY = Math.max(0, Math.min(height - 2, height - barHeight))

            if (!isFinite(topY) || !isFinite(height)) continue

            // Radiant gradient for visualizer
            const grad = ctx.createLinearGradient(0, height, 0, topY)
            grad.addColorStop(0, 'rgba(99, 102, 241, 0.4)')
            grad.addColorStop(0.5, '#a855f7')
            grad.addColorStop(1, '#ec4899')

            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.roundRect(
              i * barWidth + 1.5,
              topY,
              Math.max(1, barWidth - 3),
              barHeight,
              [4, 4, 0, 0]
            )
            ctx.fill()
          }
        }
      } else {
        // Idle gentle waveform line
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        const t = performance.now() / 1000
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.03 + t) * 5
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    draw()

    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [playerState, analyserRef, visualMode])

  const total = estimatedTotal > 0 ? estimatedTotal : generatedTotal
  const progressPct = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0
  const bufferedPct = total > 0 ? Math.min(100, (generatedTotal / total) * 100) : 0
  const totalLabel = total > 0 ? formatTime(total) : '--:--'
  const isPlaying = playerState === 'playing' || playerState === 'waiting'

  return (
    <section className="panel audio-panel">
      {/* Visual Stage Container (handles normal and fullscreen viewing) */}
      <div
        ref={stageRef}
        className={`visual-stage ${isFullscreen ? 'fullscreen' : ''} ${
          isFullscreen && !showHud ? 'hud-hidden' : ''
        }`}
        onMouseMove={handleMouseMove}
        onDoubleClick={toggleFullscreen}
      >
        {/* Top Header / Mode Switcher Toolbar */}
        <div className="visual-stage-top">
          <div className="visual-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={visualMode === 'waveform'}
              className={`visual-tab ${visualMode === 'waveform' ? 'active' : ''}`}
              onClick={() => setVisualMode('waveform')}
              title="Waveform Visualizer"
            >
              <Activity size={14} />
              <span>Waveform</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={visualMode === 'brown-noise'}
              className={`visual-tab ${visualMode === 'brown-noise' ? 'active' : ''}`}
              onClick={() => setVisualMode('brown-noise')}
              title="Brown Noise Video"
            >
              <Headphones size={14} />
              <span>Brown Noise</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={visualMode === 'cozy-cottage'}
              className={`visual-tab ${visualMode === 'cozy-cottage' ? 'active' : ''}`}
              onClick={() => setVisualMode('cozy-cottage')}
              title="Cozy Cottage Video"
            >
              <Flame size={14} />
              <span>Cozy Cottage</span>
            </button>
          </div>

          <div className="visual-stage-actions">
            {/* Ambient Sound Controls (available when viewing video modes) */}
            {(visualMode === 'brown-noise' || visualMode === 'cozy-cottage') && (
              <div className="ambient-sound-group">
                <button
                  type="button"
                  className={`visual-action-btn ${!ambientMuted ? 'active' : ''}`}
                  onClick={() => setAmbientMuted((m) => !m)}
                  title={ambientMuted ? 'Unmute video ambience' : 'Mute video ambience'}
                >
                  {ambientMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                {!ambientMuted && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="ambient-slider"
                    title={`Video ambience: ${Math.round(ambientVolume * 100)}%`}
                  />
                )}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              id="fullscreenBtn"
              className="visual-action-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen (F / Esc)' : 'Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="visual-media-wrapper">
          {/* Waveform Canvas */}
          <canvas
            ref={canvasRef}
            className={`visualizer-canvas ${visualMode !== 'waveform' ? 'hidden' : ''}`}
            id="visualizer"
          />

          {/* Brown Noise Video */}
          <video
            ref={brownNoiseRef}
            src={assetUrl('videos/brown-noise.webm')}
            loop
            playsInline
            autoPlay
            muted={ambientMuted}
            preload="auto"
            className={`visual-video ${visualMode !== 'brown-noise' ? 'hidden' : ''}`}
            onEnded={handleVideoEnded}
          />

          {/* Cozy Cottage Video */}
          <video
            ref={cozyCottageRef}
            src={assetUrl('videos/cozy-cottage.webm')}
            loop
            playsInline
            autoPlay
            muted={ambientMuted}
            preload="auto"
            className={`visual-video ${visualMode !== 'cozy-cottage' ? 'hidden' : ''}`}
            onEnded={handleVideoEnded}
          />
        </div>

        {/* Fullscreen Floating Bottom Controls HUD */}
        {isFullscreen && (
          <div
            className="fullscreen-bottom-hud"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {/* Timeline Row */}
            <div className="fullscreen-timeline-row">
              <span className="fullscreen-time">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="seek-slider fullscreen-seek"
                min="0"
                max={total || 0}
                step="0.01"
                value={currentTime || 0}
                style={{
                  '--progress': `${progressPct}%`,
                  '--buffered': `${bufferedPct}%`,
                }}
                onChange={(e) => onSeek(Number(e.target.value))}
              />
              <span className="fullscreen-time">{totalLabel}</span>
            </div>

            {/* Action Buttons Row */}
            <div className="fullscreen-controls-row">
              <div className="fullscreen-main-btns">
                <button
                  className="play-pause-btn"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  onClick={onPlayPause}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
                </button>
                <button
                  className="ctrl-btn"
                  title="Rewind 10s (Left Arrow)"
                  onClick={onRewind}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="ctrl-btn"
                  title={isMuted ? 'Unmute Story' : 'Mute Story'}
                  onClick={onToggleMute}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* Speed Controls */}
              <div className="speed-control-container">
                <button
                  className="speed-btn"
                  title="Decrease speed"
                  onClick={() => onUpdateSpeed(-0.1)}
                >
                  −
                </button>
                <div className="speed-display">
                  <span>{playbackRate.toFixed(2)}</span>x
                </div>
                <button
                  className="speed-btn"
                  title="Increase speed"
                  onClick={() => onUpdateSpeed(0.1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Standard Player Controls (Visible in Normal View) */}
      <div className="player-controls">
        {/* Play/Pause */}
        <button
          id="playPause"
          className="play-pause-btn"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={onPlayPause}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>

        {/* Rewind */}
        <button
          id="rewind"
          className="ctrl-btn"
          title="Rewind 10s (Left Arrow)"
          onClick={onRewind}
        >
          <RotateCcw size={16} />
        </button>

        {/* Time display */}
        <div id="timeDisplay" className="time-display">
          {formatTime(currentTime)} / {totalLabel}
        </div>

        {/* Seek slider */}
        <input
          type="range"
          id="seekBar"
          className="seek-slider"
          min="0"
          max={total || 0}
          step="0.01"
          value={currentTime || 0}
          style={{
            '--progress': `${progressPct}%`,
            '--buffered': `${bufferedPct}%`,
          }}
          onChange={(e) => onSeek(Number(e.target.value))}
        />

        {/* Mute */}
        <button
          id="mute"
          className="ctrl-btn"
          title={isMuted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Speed Controls */}
        <div className="speed-control-container">
          <button
            id="decrease-speed-btn"
            className="speed-btn"
            title="Decrease speed"
            onClick={() => onUpdateSpeed(-0.1)}
          >
            −
          </button>
          <div className="speed-display">
            <span id="speed-value">{playbackRate.toFixed(2)}</span>x
          </div>
          <button
            id="increase-speed-btn"
            className="speed-btn"
            title="Increase speed"
            onClick={() => onUpdateSpeed(0.1)}
          >
            +
          </button>
        </div>
      </div>

      {/* TTS Status & Actions */}
      <div className="tts-status-container" aria-live="polite">
        {statusProgress !== null && (
          <div id="ttsBar" className="tts-bar">
            <div
              id="ttsBarFill"
              className="tts-bar-fill"
              style={{ width: `${Math.round(statusProgress * 100)}%` }}
            />
          </div>
        )}
        <div className="tts-status-row">
          <span id="ttsStatus">{statusText}</span>
          {canGenAll && (
            <button id="genAll" className="link-btn" onClick={onGenAll}>
              Generate all now
            </button>
          )}
          {canRetry && (
            <button id="retryBtn" className="link-btn" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>

      <audio ref={audioRef} id="audio" preload="auto" hidden />
    </section>
  )
}

