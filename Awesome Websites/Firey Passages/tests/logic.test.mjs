import test from "node:test"
import assert from "node:assert/strict"
import {
  parseStoryFile, safeHttpUrl, sourceKeyFor, countWords, decodeTextBytes, looksLikeText,
} from "../scripts/story-parser.js"
import { chunkText, splitSentences, MAX_CHARS, FIRST_MAX_CHARS, PAUSE } from "../scripts/chunker.js"
import { encodeWav, trimSilence } from "../scripts/wav.js"

const SEP = "=".repeat(50)

// ---------- parser ----------
test("parses the exact format the scraper writes", () => {
  const raw = `Title: Batteries Not Included\nDescription: I hate it when the batteries die.\nURL: https://www.website.com/s/batteries-not-included-4\n${SEP}\n\nStory Text Here Onwards\n\nSecond para.`
  const s = parseStoryFile(raw, "whatever.txt")
  assert.equal(s.title, "Batteries Not Included")
  assert.equal(s.description, "I hate it when the batteries die.")
  assert.equal(s.url, "https://www.website.com/s/batteries-not-included-4")
  assert.equal(s.text, "Story Text Here Onwards\n\nSecond para.")
  assert.equal(s.hasHeader, true)
})

test("handles CRLF, BOM, and lowercase keys", () => {
  const raw = `\uFEFFtitle: A\r\nurl: http://x.y/z\r\n${SEP}\r\n\r\nBody line one.\r\nBody line two.\r\n`
  const s = parseStoryFile(raw, "f.txt")
  assert.equal(s.title, "A")
  assert.equal(s.url, "http://x.y/z")
  assert.equal(s.description, "")
  assert.equal(s.text, "Body line one.\nBody line two.")
})

test("description is optional (scraper omits it when empty)", () => {
  const s = parseStoryFile(`Title: T\nURL: https://a.b/c\n${SEP}\n\nHello there.`)
  assert.equal(s.description, "")
  assert.equal(s.text, "Hello there.")
})

test("multi-line descriptions stay attached", () => {
  const s = parseStoryFile(`Title: T\nDescription: first line\nsecond line\nURL: https://a.b/c\n${SEP}\n\nBody.`)
  assert.equal(s.description, "first line\nsecond line")
  assert.equal(s.url, "https://a.b/c")
})

test("file with no header falls back to file name", () => {
  const s = parseStoryFile("Just a story.\nNothing else.", "My Story.txt")
  assert.equal(s.title, "My Story")
  assert.equal(s.hasHeader, false)
  assert.equal(s.text, "Just a story.\nNothing else.")
})

test("a decorative ==== line inside the story is not mistaken for a header", () => {
  const s = parseStoryFile(`Once upon a time.\n${SEP}\nThe end.`, "x.txt")
  assert.equal(s.hasHeader, false)
  assert.match(s.text, /Once upon a time/)
  assert.match(s.text, /The end/)
})

test("header without separator ends at first blank line", () => {
  const s = parseStoryFile("Title: T\nURL: https://a.b\n\nBody here.")
  assert.equal(s.title, "T")
  assert.equal(s.text, "Body here.")
})

test("safeHttpUrl rejects javascript: and garbage", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), "")
  assert.equal(safeHttpUrl("not a url"), "")
  assert.equal(safeHttpUrl("https://a.b/c"), "https://a.b/c")
})

test("sourceKeyFor prefers url, falls back to title", () => {
  assert.equal(sourceKeyFor({ url: "https://a.b/c", title: "X" }), "url:https://a.b/c")
  assert.equal(sourceKeyFor({ url: "", title: " Hello " }), "title:hello")
})

test("countWords / looksLikeText / decodeTextBytes", () => {
  assert.equal(countWords("a b  c\nd"), 4)
  assert.equal(looksLikeText("hello world"), true)
  assert.equal(looksLikeText("\0\0\0\0\0\0\0\0\0\0"), false)
  const utf16 = new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00])
  assert.equal(decodeTextBytes(utf16.buffer), "hi")
  assert.equal(decodeTextBytes(new TextEncoder().encode("caf\u00e9").buffer), "caf\u00e9")
})

// ---------- sentence splitting ----------
test("splitSentences: abbreviations, initials, dialogue tags, decimals", () => {
  assert.deepEqual(splitSentences("Dr. Smith arrived. He sat."), ["Dr. Smith arrived.", "He sat."])
  assert.deepEqual(splitSentences("J. K. Rowling wrote it. Fine."), ["J. K. Rowling wrote it.", "Fine."])
  assert.deepEqual(splitSentences('"Stop!" he shouted. She froze.'), ['"Stop!" he shouted.', "She froze."])
  assert.deepEqual(splitSentences("It cost 3.5 dollars. Cheap."), ["It cost 3.5 dollars.", "Cheap."])
  assert.deepEqual(splitSentences("Wait... what? Yes."), ["Wait... what?", "Yes."])
  assert.deepEqual(splitSentences('She said, "Go." He left.'), ['She said, "Go."', "He left."])
  assert.deepEqual(splitSentences("No trailing punctuation"), ["No trailing punctuation"])
})

// ---------- chunker ----------
test("chunks respect size limits and never lose text", () => {
  const sentence = "The quick brown fox jumps over the lazy dog near the river bank. "
  const body = sentence.repeat(60)
  const chunks = chunkText(body)
  assert.ok(chunks.length > 5)
  chunks.forEach((c, i) => {
    assert.equal(c.index, i)
    assert.ok(c.text.length <= (i === 0 ? FIRST_MAX_CHARS : MAX_CHARS), `chunk ${i} is ${c.text.length}`)
  })
  const rejoined = chunks.map((c) => c.text).join(" ")
  assert.equal(rejoined.replace(/\s+/g, " "), body.trim().replace(/\s+/g, " "))
})

test("very long sentence with no punctuation is still split", () => {
  const body = "word ".repeat(400).trim() + "."
  const chunks = chunkText(body)
  assert.ok(chunks.length >= 7)
  assert.ok(chunks.every((c) => c.text.length <= MAX_CHARS))
})

test("a single 500-char word cannot blow the limit", () => {
  const chunks = chunkText("x".repeat(500))
  assert.ok(chunks.every((c) => c.text.length <= MAX_CHARS))
  assert.equal(chunks.map((c) => c.text).join("").length, 500)
})

test("pauses: paragraph > line > sentence, scene break adds extra", () => {
  const chunks = chunkText("First para here.\n\nSecond line one.\nSecond line two.\n\n* * *\n\nAfter the break.")
  assert.equal(chunks[0].pause, PAUSE.paragraph)
  const second = chunks.find((c) => c.text.startsWith("Second line one"))
  assert.equal(second.pause, PAUSE.line)
  const lastBeforeBreak = chunks.find((c) => c.text.startsWith("Second line two"))
  assert.equal(lastBeforeBreak.pause, PAUSE.paragraph + PAUSE.sceneBreak)
  assert.ok(!chunks.some((c) => c.text.includes("*")))
})

test("hard-wrapped lines are re-joined, real paragraph lines are not", () => {
  const wrapped = chunkText("The cat sat on the\nmat and purred loudly.")
  assert.equal(wrapped.length, 1)
  assert.equal(wrapped[0].text, "The cat sat on the mat and purred loudly.")
  // A line break after a finished sentence is a real paragraph boundary:
  // it stays a separate chunk so the spoken pause matches the text.
  const separate = chunkText('He left.\n"Wait," she said.')
  assert.deepEqual(separate.map((c) => c.text), ["He left.", '"Wait," she said.'])
  assert.equal(separate[0].pause, PAUSE.line)
})

test("punctuation-only and empty input produce no chunks", () => {
  assert.deepEqual(chunkText(""), [])
  assert.deepEqual(chunkText("...\n\n---\n\n   "), [])
})

test("chunking is deterministic (cache keys depend on it)", () => {
  const body = "Alpha beta gamma. ".repeat(80) + "\n\n" + "Delta epsilon zeta. ".repeat(80)
  assert.deepEqual(chunkText(body), chunkText(body))
})

test("first chunk is short so playback can start quickly", () => {
  const chunks = chunkText("This is a fairly ordinary sentence of moderate length. ".repeat(20))
  assert.ok(chunks[0].text.length <= FIRST_MAX_CHARS)
  assert.ok(chunks[1].text.length > FIRST_MAX_CHARS)
})

// ---------- wav ----------
test("encodeWav writes a valid 16-bit mono header and correct duration", () => {
  const sr = 24000
  const samples = new Float32Array(sr).fill(0.5) // 1 second
  const { blob, duration } = encodeWav(samples, sr, 0.5)
  assert.ok(Math.abs(duration - 1.5) < 1e-9)
  assert.equal(blob.size, 44 + 2 * Math.round(1.5 * sr))
  return blob.arrayBuffer().then((buf) => {
    const dv = new DataView(buf)
    const tag = (o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3))
    assert.equal(tag(0), "RIFF")
    assert.equal(tag(8), "WAVE")
    assert.equal(tag(12), "fmt ")
    assert.equal(dv.getUint16(20, true), 1) // PCM
    assert.equal(dv.getUint16(22, true), 1) // mono
    assert.equal(dv.getUint32(24, true), sr)
    assert.equal(dv.getUint16(34, true), 16)
    assert.equal(tag(36), "data")
    assert.equal(dv.getUint32(40, true), 2 * Math.round(1.5 * sr))
    assert.equal(dv.getInt16(44, true), Math.round(0.5 * 32767))
    assert.equal(dv.getInt16(buf.byteLength - 2, true), 0) // padding is silence
  })
})

test("encodeWav clamps out-of-range samples", () => {
  const { blob } = encodeWav(new Float32Array([2, -2, 0]), 24000, 0)
  return blob.arrayBuffer().then((buf) => {
    const dv = new DataView(buf)
    assert.equal(dv.getInt16(44, true), 32767)
    assert.equal(dv.getInt16(46, true), -32768)
  })
})

test("trimSilence removes leading/trailing silence but keeps a margin", () => {
  const sr = 24000
  const x = new Float32Array(sr * 3) // 3 s of zeros
  for (let i = sr; i < sr * 2; i++) x[i] = 0.3 // speech from 1.0s to 2.0s
  const t = trimSilence(x, sr)
  assert.ok(t.length < x.length)
  assert.ok(t.length > sr) // never cuts into the speech
  assert.ok(t.length < sr * 1.3)
  // all-silence input stays a tiny, valid array
  assert.ok(trimSilence(new Float32Array(sr), sr).length <= sr)
})
