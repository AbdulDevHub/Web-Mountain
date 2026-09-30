// Splits a story into chunks small enough for Kokoro to speak in one go.
//
// Why this exists: kokoro-js silently truncates anything past ~510 phoneme
// tokens, and quality drops on very long inputs, so we split at sentence
// boundaries ourselves and merge short sentences up to a target size.
//
// The output must be deterministic for a given text: generated audio is
// cached per chunk index. Bump CHUNKER_VERSION if the algorithm changes so
// stale caches are ignored.

export const CHUNKER_VERSION = 1

export const MAX_CHARS = 280 // target upper bound per chunk
export const FIRST_MAX_CHARS = 140 // keep chunk #0 short so playback starts sooner

// Silence (seconds) added after a chunk, on top of trimming the model's own
// leading/trailing silence, so cadence is consistent.
export const PAUSE = {
  sentence: 0.08,
  line: 0.4, // single line break
  paragraph: 0.6, // blank line
  sceneBreak: 0.9, // extra for "***" / "---" lines
}

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "vs", "etc",
  "fig", "gen", "col", "lt", "sgt", "capt", "rev", "hon", "inc", "ltd",
  "co", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept",
  "oct", "nov", "dec", "e.g", "i.e", "a.m", "p.m",
])
const TERMINATORS = ".!?…"
const CLOSERS = "\"'”’)]»"

function normalize(s) {
  return String(s)
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, " ")
}

const SCENE_BREAK = /^[\s*\-_=~#•·.+\u2013\u2014]{3,}$/
const ENDS_SENTENCE = /[.!?…:;"'”’)\]*_]$/

function isAbbreviation(text, periodIndex) {
  let k = periodIndex - 1
  while (k >= 0 && /[A-Za-z.]/.test(text[k])) k--
  const token = text.slice(k + 1, periodIndex)
  if (!token) return false
  if (ABBREVIATIONS.has(token.toLowerCase())) return true
  // Initials and dotted acronyms: "J." "U.S." "P.S."
  return /^([A-Za-z]\.)*[A-Za-z]$/.test(token)
}

export function splitSentences(text) {
  const out = []
  const n = text.length
  let start = 0
  let i = 0
  while (i < n) {
    if (!TERMINATORS.includes(text[i])) {
      i++
      continue
    }
    const first = text[i]
    let end = i
    while (end + 1 < n && TERMINATORS.includes(text[end + 1])) end++
    while (end + 1 < n && CLOSERS.includes(text[end + 1])) end++

    // "3.14", "example.com": terminator not followed by whitespace.
    if (end + 1 < n && !/\s/.test(text[end + 1])) {
      i = end + 1
      continue
    }
    let j = end + 1
    while (j < n && /\s/.test(text[j])) j++

    if (j < n) {
      // '"Stop!" he said.' and "Well... maybe" continue the same sentence.
      if (/\p{Ll}/u.test(text[j])) {
        i = end + 1
        continue
      }
      if (first === "." && end === i && isAbbreviation(text, i)) {
        i = end + 1
        continue
      }
    }
    out.push(text.slice(start, end + 1))
    start = j
    i = j
  }
  if (start < n) out.push(text.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}

function splitAtSpaces(s, max) {
  const pieces = []
  let buf = ""
  for (const word of s.split(/\s+/)) {
    if (word.length > max) {
      if (buf) pieces.push(buf)
      buf = ""
      for (let p = 0; p < word.length; p += max) pieces.push(word.slice(p, p + max))
      continue
    }
    if (buf && buf.length + 1 + word.length > max) {
      pieces.push(buf)
      buf = word
    } else {
      buf = buf ? `${buf} ${word}` : word
    }
  }
  if (buf) pieces.push(buf)
  return pieces
}

// A single sentence longer than `max`: break at clause punctuation first,
// then at spaces as a last resort.
function splitLong(s, max) {
  const pieces = []
  let buf = ""
  for (const clause of s.split(/(?<=[,;:\u2013\u2014])\s+/)) {
    if (clause.length > max) {
      if (buf) pieces.push(buf)
      buf = ""
      pieces.push(...splitAtSpaces(clause, max))
    } else if (buf && buf.length + 1 + clause.length > max) {
      pieces.push(buf)
      buf = clause
    } else {
      buf = buf ? `${buf} ${clause}` : clause
    }
  }
  if (buf) pieces.push(buf)
  return pieces
}

// Groups raw lines into paragraphs. `gap` is how the paragraph ends:
// 1 = single line break, 2 = blank line. Hard-wrapped text (a line that
// stops mid-sentence and the next starts lowercase) is re-joined.
function toParagraphs(body) {
  const paras = []
  let cur = null
  const flush = (gap) => {
    if (cur !== null) paras.push({ text: cur, gap })
    cur = null
  }
  for (const raw of normalize(body).split("\n")) {
    const line = raw.trim()
    if (line === "") {
      flush(2)
    } else if (SCENE_BREAK.test(line)) {
      flush(2)
      paras.push({ scene: true })
    } else if (cur === null) {
      cur = line
    } else if (!ENDS_SENTENCE.test(cur) && /^\p{Ll}/u.test(line)) {
      cur += ` ${line}`
    } else {
      flush(1)
      cur = line
    }
  }
  flush(2)
  return paras
}

export function chunkText(body, { maxChars = MAX_CHARS, firstMaxChars = FIRST_MAX_CHARS } = {}) {
  const chunks = []
  const push = (t) => {
    const text = t.replace(/\s+/g, " ").trim()
    if (/[\p{L}\p{N}]/u.test(text)) chunks.push({ text, pause: PAUSE.sentence })
  }

  for (const para of toParagraphs(body)) {
    if (para.scene) {
      if (chunks.length) chunks[chunks.length - 1].pause += PAUSE.sceneBreak
      continue
    }
    const before = chunks.length
    let buf = ""
    for (const sentence of splitSentences(para.text)) {
      const cap = chunks.length === 0 ? firstMaxChars : maxChars
      if (sentence.length > cap) {
        if (buf) push(buf)
        buf = ""
        for (const piece of splitLong(sentence, cap)) push(piece)
      } else if (buf && buf.length + 1 + sentence.length > cap) {
        push(buf)
        buf = sentence
      } else {
        buf = buf ? `${buf} ${sentence}` : sentence
      }
    }
    if (buf) push(buf)
    if (chunks.length > before) {
      chunks[chunks.length - 1].pause = para.gap >= 2 ? PAUSE.paragraph : PAUSE.line
    }
  }
  return chunks.map((c, index) => ({ index, ...c }))
}
