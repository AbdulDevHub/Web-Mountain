// Persistent storage (IndexedDB) for uploaded stories and generated audio.
//
//   stories: one record per story           (keyPath: id)
//   audio:   one record per generated chunk (keyPath: key, WAV Blob inside)
//
// Audio is keyed by story + voice + text hash + chunker version ("set id"),
// so changing the voice or re-uploading edited text never plays stale audio,
// while re-uploading identical text keeps the cache.

import { CHUNKER_VERSION } from "./chunker.js"
import { sourceKeyFor, countWords } from "./story-parser.js"

const DB_NAME = "fiery-passages"
const DB_VERSION = 1
let dbPromise = null

function openDB() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      const stories = db.createObjectStore("stories", { keyPath: "id" })
      stories.createIndex("sourceKey", "sourceKey")
      const audio = db.createObjectStore("audio", { keyPath: "key" })
      audio.createIndex("setId", "setId")
      audio.createIndex("storyId", "storyId")
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error("Database is blocked by another tab"))
  })
  return dbPromise
}

// Runs fn(store) inside a transaction and resolves with the request result
// once the transaction has committed.
async function run(storeName, mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode)
    let result
    try {
      const req = fn(t.objectStore(storeName))
      if (req && "result" in req) req.onsuccess = () => (result = req.result)
    } catch (err) {
      reject(err)
      return
    }
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error("Transaction aborted"))
  })
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

// ---------- stories ----------

export async function listStories() {
  const all = await run("stories", "readonly", (s) => s.getAll())
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export function getStory(id) {
  return run("stories", "readonly", (s) => s.get(id))
}

// Adds a parsed story, or updates it in place if the same story (by URL, else
// by title) was uploaded before. Returns { story, status } where status is
// "added" | "updated" | "unchanged".
export async function upsertStory(parsed) {
  const sourceKey = sourceKeyFor(parsed)
  const textHash = await sha256Hex(parsed.text)
  const existing = await run("stories", "readonly", (s) => s.index("sourceKey").get(sourceKey))
  const now = Date.now()
  const fields = {
    title: parsed.title,
    description: parsed.description,
    url: parsed.url,
    text: parsed.text,
    textHash,
    wordCount: countWords(parsed.text),
  }

  if (existing) {
    const changed =
      existing.textHash !== textHash ||
      existing.title !== fields.title ||
      existing.description !== fields.description ||
      existing.url !== fields.url
    if (!changed) return { story: existing, status: "unchanged" }
    const story = { ...existing, ...fields, updatedAt: now }
    await run("stories", "readwrite", (s) => s.put(story))
    if (existing.textHash !== textHash) await deleteAudioForStory(existing.id)
    return { story, status: "updated" }
  }

  const story = { id: crypto.randomUUID(), sourceKey, ...fields, createdAt: now, updatedAt: now }
  await run("stories", "readwrite", (s) => s.put(story))
  return { story, status: "added" }
}

export async function deleteStory(id) {
  await deleteAudioForStory(id)
  await run("stories", "readwrite", (s) => s.delete(id))
}

// ---------- audio ----------

export function audioSetId(story, voice) {
  return `${story.id}|${voice}|${story.textHash.slice(0, 16)}|v${CHUNKER_VERSION}`
}

const chunkKey = (setId, index) => `${setId}|${String(index).padStart(6, "0")}`

// Returns the cached chunks for a set as a contiguous run starting at index 0
// ([{ index, blob, duration, bytes, skipped }]). `skipped` marks a silent
// placeholder for a passage the voice couldn't read. A gap ends the run: generation
// resumes from the first missing chunk.
export async function loadAudioSet(setId) {
  const records = await run("audio", "readonly", (s) => s.index("setId").getAll(IDBKeyRange.only(setId)))
  records.sort((a, b) => a.index - b.index)
  const prefix = []
  for (const r of records) {
    if (r.index !== prefix.length) break
    prefix.push({ index: r.index, blob: r.blob, duration: r.duration, bytes: r.bytes, skipped: !!r.skipped, fullAudio: !!r.fullAudio })
  }
  return prefix
}

// Stores a chunk and returns the copy backed by IndexedDB's own storage, so
// callers can drop the in-memory original (a long story is hundreds of MB).
// Pass fullAudio: true when the blob represents the entire story (imported WAV/MP3),
// so openStory can skip generation entirely.
export async function saveAudioChunk({ setId, storyId, index, blob, duration, skipped = false, fullAudio = false }) {
  const record = { key: chunkKey(setId, index), setId, storyId, index, blob, duration, bytes: blob.size, skipped, fullAudio }
  await run("audio", "readwrite", (s) => s.put(record))
  try {
    const stored = await run("audio", "readonly", (s) => s.get(record.key))
    return stored?.blob ?? blob
  } catch {
    return blob
  }
}

// Deletes every cached chunk for a story (optionally keeping one set).
export async function deleteAudioForStory(storyId, keepSetId = null) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction("audio", "readwrite")
    const req = t.objectStore("audio").index("storyId").openCursor(IDBKeyRange.only(storyId))
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      if (cursor.value.setId !== keepSetId) cursor.delete()
      cursor.continue()
    }
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error("Transaction aborted"))
  })
}
