import React, { useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Activity } from 'lucide-react'

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

  // Draw visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let active = true

    const draw = () => {
      if (!active) return
      animFrameRef.current = requestAnimationFrame(draw)

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
        const binCount = analyser.frequencyBinCount
        const dataArray = new Uint8Array(binCount)
        analyser.getByteFrequencyData(dataArray)

        const barCount = 32
        const step = Math.floor(binCount / barCount)
        const barWidth = width / barCount

        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j] || 0
          }
          const val = sum / step
          const barHeight = (val / 255) * height * 0.9

          // Radiant gradient for visualizer
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight)
          grad.addColorStop(0, 'rgba(99, 102, 241, 0.4)')
          grad.addColorStop(0.5, '#a855f7')
          grad.addColorStop(1, '#ec4899')

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.roundRect(
            i * barWidth + 1,
            height - barHeight,
            Math.max(1, barWidth - 3),
            barHeight,
            [3, 3, 0, 0]
          )
          ctx.fill()
        }
      } else {
        // Idle gentle waveform line
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        const t = performance.now() / 1000
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.03 + t) * 4
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
  }, [playerState, analyserRef])

  const total = estimatedTotal > 0 ? estimatedTotal : generatedTotal
  const progressPct = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0
  const bufferedPct = total > 0 ? Math.min(100, (generatedTotal / total) * 100) : 0
  const totalLabel = total > 0 ? formatTime(total) : '--:--'
  const isPlaying = playerState === 'playing' || playerState === 'waiting'

  return (
    <section className="panel audio-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Activity size={18} color="#a5b4fc" />
          <span>Audio Player</span>
        </h2>
      </div>

      <canvas ref={canvasRef} className="visualizer-canvas" id="visualizer" />

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
