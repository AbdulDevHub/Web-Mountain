// Stand-in for vendor/tts-worker.js that speaks the same protocol but just
// synthesises a tone "babble" (one short note per word). It exists so the
// UI, caching and player can be developed/tested without downloading the
// 86 MB Kokoro model. Enable with:  index.html?engine=fake
// Optional: &delay=200 (ms per chunk) to simulate slower/faster generation,
//           &initfail=1 to simulate the model download failing.
// Any chunk containing the word FAIL_ME fails, to exercise error handling.

const SR = 24000
const params = new URL(self.location.href).searchParams
const DELAY = Number(params.get("delay") ?? 120)
const INIT_FAIL = params.get("initfail") === "1"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function synth(text) {
  const words = text.split(/\s+/).filter(Boolean)
  const lead = Math.round(0.15 * SR) // silence the app is expected to trim
  const parts = [new Float32Array(lead)]
  for (const w of words) {
    const n = Math.round((0.12 + 0.02 * Math.min(w.length, 12)) * SR)
    const f = 180 + (hash(w) % 160)
    const note = new Float32Array(n + Math.round(0.03 * SR))
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / (0.01 * SR), (n - i) / (0.02 * SR))
      const t = i / SR
      note[i] = 0.25 * env * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * 2 * f * t))
    }
    parts.push(note)
  }
  parts.push(new Float32Array(Math.round(0.2 * SR)))
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

let chain = Promise.resolve()
self.onmessage = (e) => {
  const msg = e.data
  chain = chain.then(async () => {
    try {
      if (msg.type === "init") {
        const total = 86 * 1024 * 1024
        for (let i = 1; i <= 5; i++) {
          await sleep(60)
          self.postMessage({ type: "progress", loaded: (total * i) / 5, total })
        }
        if (INIT_FAIL) throw new Error("simulated download failure")
        self.postMessage({ type: "ready", device: "fake", dtype: "none", threads: 1 })
      } else if (msg.type === "generate") {
        if (/\bFAIL_ME\b/.test(msg.text)) throw new Error("simulated model failure")
        await sleep(DELAY)
        const samples = synth(msg.text)
        self.postMessage({ type: "audio", id: msg.id, samples, sampleRate: SR }, [samples.buffer])
      }
    } catch (err) {
      self.postMessage({ type: "error", id: msg.id, message: String(err?.message || err) })
    }
  })
}
