// Main-thread wrapper around the TTS worker: lazy start, model-download
// progress events, and a promise-based generate().

const REAL_WORKER = new URL("../vendor/tts-worker.js", import.meta.url)
const FAKE_WORKER = new URL("./dev/fake-tts-worker.js", import.meta.url)

function workerUrl() {
  const q = new URLSearchParams(location.search)
  if (q.get("engine") === "fake") {
    const url = new URL(FAKE_WORKER)
    for (const k of ["delay", "initfail"]) if (q.has(k)) url.searchParams.set(k, q.get(k))
    return url
  }
  return REAL_WORKER
}

export class TTSClient extends EventTarget {
  #worker = null
  #ready = null // Promise<info> for the current worker
  #device = null
  #pending = new Map() // id -> { resolve, reject }
  #seq = 0
  #initHandlers = null
  info = null // { device, dtype, threads } once ready

  get isReady() {
    return this.info !== null
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }))
  }

  // Starts the worker and loads the model (downloading it the first time).
  ensureReady(device = "wasm") {
    if (this.#ready && this.#device === device) return this.#ready
    this.dispose()
    this.#device = device

    this.#ready = new Promise((resolve, reject) => {
      this.#initHandlers = { resolve, reject }
    })
    this.#ready.catch(() => {}) // avoid unhandled-rejection noise; callers handle it

    const worker = new Worker(workerUrl(), { type: "module" })
    this.#worker = worker
    worker.onmessage = (e) => this.#onMessage(e.data)
    worker.onerror = (e) => {
      e.preventDefault?.()
      this.#fail(new Error(e.message ? `TTS worker error: ${e.message}` : "The TTS worker failed to start"))
    }
    worker.onmessageerror = () => this.#fail(new Error("The TTS worker sent an unreadable message"))
    worker.postMessage({ type: "init", device })
    return this.#ready
  }

  async generate(text, voice) {
    await this.ensureReady(this.#device ?? "wasm")
    const id = ++this.#seq
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject })
      this.#worker.postMessage({ type: "generate", id, text, voice })
    })
  }

  #onMessage(msg) {
    switch (msg.type) {
      case "progress":
        this.#emit("progress", { loaded: msg.loaded, total: msg.total })
        break
      case "info":
        this.#emit("info", msg.message)
        break
      case "ready":
        this.info = { device: msg.device, dtype: msg.dtype, threads: msg.threads }
        this.#initHandlers?.resolve(this.info)
        this.#initHandlers = null
        break
      case "audio": {
        const p = this.#pending.get(msg.id)
        this.#pending.delete(msg.id)
        p?.resolve({ samples: msg.samples, sampleRate: msg.sampleRate })
        break
      }
      case "error": {
        const err = new Error(msg.message)
        if (msg.id != null) {
          const p = this.#pending.get(msg.id)
          this.#pending.delete(msg.id)
          p?.reject(err)
        } else {
          this.#fail(err)
        }
        break
      }
    }
  }

  // Worker-level failure: reject everything and reset so the next call retries.
  #fail(err) {
    this.#initHandlers?.reject(err)
    this.#initHandlers = null
    for (const p of this.#pending.values()) p.reject(err)
    this.#pending.clear()
    this.#teardown()
  }

  #teardown() {
    this.#worker?.terminate()
    this.#worker = null
    this.#ready = null
    this.info = null
  }

  dispose() {
    const err = new DOMException("TTS engine stopped", "AbortError")
    this.#initHandlers?.reject(err)
    this.#initHandlers = null
    for (const p of this.#pending.values()) p.reject(err)
    this.#pending.clear()
    this.#teardown()
  }
}
