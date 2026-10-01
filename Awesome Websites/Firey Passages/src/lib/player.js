// SegmentPlayer: plays a story that is generated (or loaded from cache) as a
// growing list of short WAV segments, while presenting ONE continuous
// timeline (seek, time, speed) to the UI.
//
// Two <audio> elements ping-pong: while one plays segment N, the other has
// segment N+1 preloaded, so the hand-off at the end of a segment is a
// play() on an already-buffered element. Playback speed uses the browser's
// own <audio> playbackRate, which preserves pitch (Web Audio's
// AudioBufferSourceNode does not).
//
// Events: "timeupdate", "state", "segments"
// States: "idle" | "paused" | "playing" | "waiting" (out of audio, more is
//         being generated) | "ended"

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export class SegmentPlayer extends EventTarget {
  constructor(primaryAudio) {
    super()
    const second = new Audio()
    this.els = [primaryAudio, second]
    for (const el of this.els) {
      el.preload = "auto"
      el.preservesPitch = true
      el.addEventListener("ended", () => el === this.activeEl && this.#onEnded())
      el.addEventListener("timeupdate", () => el === this.activeEl && this.#emit("timeupdate"))
    }
    this.active = 0
    this.segs = [] // [{ url, dur, start }]
    this.cur = -1 // segment loaded in the active element
    this.pre = -1 // segment preloaded in the idle element
    this.loadToken = 0
    this.loadingOffset = null // target offset while a segment's metadata loads
    this.wantPlay = false
    this.waiting = false
    this.finished = false // no more segments will arrive
    this.state = "idle"
    this.rate = 1
    this.muted = false
  }

  get activeEl() {
    return this.els[this.active]
  }
  get idleEl() {
    return this.els[this.active ^ 1]
  }
  get generatedTotal() {
    const last = this.segs[this.segs.length - 1]
    return last ? last.start + last.dur : 0
  }
  get currentTime() {
    if (this.cur < 0) return 0
    // While a seek into another segment is still loading, report the target.
    return this.segs[this.cur].start + (this.loadingOffset ?? this.activeEl.currentTime)
  }

  #emit(type) {
    this.dispatchEvent(new Event(type))
  }
  #setState(state) {
    if (state === this.state) return
    this.state = state
    this.#emit("state")
  }

  // ---- lifecycle ----

  reset() {
    this.loadToken++
    for (const el of this.els) {
      el.pause()
      el.removeAttribute("src")
      el.load()
    }
    for (const s of this.segs) URL.revokeObjectURL(s.url)
    this.segs = []
    this.cur = this.pre = -1
    this.loadingOffset = null
    this.wantPlay = this.waiting = this.finished = false
    this.state = "idle"
    this.#emit("state")
    this.#emit("segments")
    this.#emit("timeupdate")
  }

  addSegment(blob, duration) {
    this.segs.push({ url: URL.createObjectURL(blob), dur: duration, start: this.generatedTotal })
    const wasFirst = this.segs.length === 1
    if (wasFirst) {
      this.#load(0, 0, false)
      if (this.state === "idle") this.#setState("paused")
    }
    this.#emit("segments")
    if (this.waiting && this.cur === this.segs.length - 2) this.#advance()
    else if (wasFirst && this.wantPlay) {
      this.#playActive()
      this.#setState("playing")
    }
    this.#ensurePreload()
  }

  markFinished() {
    this.finished = true
    if (this.waiting) {
      this.waiting = false
      this.wantPlay = false
      this.#setState("ended")
    }
  }

  // ---- transport ----

  play() {
    this.wantPlay = true
    if (!this.segs.length || this.waiting) {
      this.#setState("waiting") // audio will start as soon as the first segment lands
      return
    }
    if (this.state === "ended") this.seek(0)
    this.#playActive()
    this.#setState("playing")
  }

  pause() {
    this.wantPlay = false
    this.waiting = false
    this.activeEl.pause()
    this.#setState(this.segs.length ? "paused" : "idle")
  }

  seek(t) {
    if (!this.segs.length) return
    t = clamp(t, 0, this.generatedTotal)
    let lo = 0
    let hi = this.segs.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.segs[mid].start <= t) lo = mid
      else hi = mid - 1
    }
    const offset = clamp(t - this.segs[lo].start, 0, this.segs[lo].dur)
    this.waiting = false
    if (this.state === "ended" || this.state === "waiting") this.#setState(this.wantPlay ? "playing" : "paused")

    if (lo === this.cur) {
      this.loadToken++ // supersede any still-pending metadata handler
      this.loadingOffset = null
      this.activeEl.currentTime = offset
      if (this.wantPlay && this.activeEl.paused) this.#playActive()
    } else {
      this.#load(lo, offset, this.wantPlay)
    }
    this.#ensurePreload()
    this.#emit("timeupdate")
  }

  setRate(rate) {
    this.rate = clamp(rate, 0.25, 4)
    for (const el of this.els) {
      el.defaultPlaybackRate = this.rate // survives src changes
      el.playbackRate = this.rate
    }
  }

  setMuted(muted) {
    this.muted = muted
    for (const el of this.els) el.muted = muted
  }

  // Route both elements through a Web Audio graph (for the visualizer).
  connectAnalyser(audioCtx, analyser) {
    for (const el of this.els) {
      if (el._fpSource) continue
      el._fpSource = audioCtx.createMediaElementSource(el)
      el._fpSource.connect(analyser)
    }
  }

  // ---- internals ----

  #playActive() {
    const el = this.activeEl
    el.defaultPlaybackRate = this.rate
    el.playbackRate = this.rate
    el.play().catch(() => {}) // a rejected play() just leaves us paused
  }

  #load(index, offset, autoplay) {
    const el = this.activeEl
    const token = ++this.loadToken
    this.cur = index
    if (this.pre === index) this.pre = -1
    el.src = this.segs[index].url
    el.defaultPlaybackRate = this.rate
    el.playbackRate = this.rate
    this.loadingOffset = offset > 0 ? offset : null
    if (offset > 0) {
      el.addEventListener(
        "loadedmetadata",
        () => {
          if (token !== this.loadToken) return
          el.currentTime = offset
          this.loadingOffset = null
          this.#emit("timeupdate")
        },
        { once: true },
      )
    }
    if (autoplay) this.#playActive()
  }

  #ensurePreload() {
    const next = this.cur + 1
    if (this.cur < 0 || next >= this.segs.length || this.pre === next) return
    const el = this.idleEl
    el.src = this.segs[next].url
    el.defaultPlaybackRate = this.rate
    el.playbackRate = this.rate
    this.pre = next
  }

  #advance() {
    const next = this.cur + 1
    if (next >= this.segs.length) {
      this.waiting = true
      this.#setState("waiting")
      return
    }
    this.waiting = false
    if (this.pre === next) {
      this.active ^= 1 // swap: the preloaded element becomes active
      this.cur = next
      this.pre = -1
      this.loadToken++
      this.loadingOffset = null
      this.#playActive()
    } else {
      this.#load(next, 0, true)
    }
    this.#setState("playing")
    this.#ensurePreload()
  }

  #onEnded() {
    if (!this.wantPlay) {
      this.#setState(this.finished && this.cur === this.segs.length - 1 ? "ended" : "paused")
      return
    }
    if (this.cur + 1 < this.segs.length) this.#advance()
    else if (this.finished) {
      this.wantPlay = false
      this.#setState("ended")
    } else {
      this.waiting = true
      this.#setState("waiting")
    }
  }
}
