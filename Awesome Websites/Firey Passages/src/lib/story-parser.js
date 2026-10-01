// Parses story .txt files:
//
//   Title: Batteries Not Included
//   Description: I hate it when the batteries die.
//   ==================================================
//
//   Story text here onwards...
//
// Description is optional. A file with no header at all is still
// accepted: the file name becomes the title and the whole file is the story.

const KEY_LINE = /^\s*(title|description|url)\s*:\s?(.*)$/i
const SEPARATOR = /^\s*={3,}\s*$/
const MAX_HEADER_SCAN_LINES = 80

export function parseStoryFile(rawText, fileName = "") {
  const text = String(rawText).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
  const lines = text.split("\n")

  let separatorIndex = -1
  for (let i = 0; i < Math.min(lines.length, MAX_HEADER_SCAN_LINES); i++) {
    if (SEPARATOR.test(lines[i])) {
      separatorIndex = i
      break
    }
  }

  let headerLines = []
  let bodyLines = lines

  if (separatorIndex >= 0) {
    const candidate = lines.slice(0, separatorIndex)
    if (candidate.some((l) => KEY_LINE.test(l))) {
      headerLines = candidate
      bodyLines = lines.slice(separatorIndex + 1)
    }
  } else {
    // No separator: accept a leading run of "Key: value" lines that ends at
    // the first blank line, but only if the file actually starts with one.
    const firstContent = lines.findIndex((l) => l.trim() !== "")
    if (firstContent >= 0 && KEY_LINE.test(lines[firstContent])) {
      let end = firstContent
      while (end < lines.length && lines[end].trim() !== "") end++
      headerLines = lines.slice(firstContent, end)
      bodyLines = lines.slice(end)
    }
  }

  const header = { title: "", description: "", url: "" }
  let currentKey = null
  for (const line of headerLines) {
    const m = KEY_LINE.exec(line)
    if (m) {
      currentKey = m[1].toLowerCase()
      header[currentKey] = m[2].trim()
    } else if (currentKey && line.trim() !== "") {
      // Scraped descriptions can contain line breaks; keep them attached.
      const joiner = currentKey === "description" ? "\n" : " "
      header[currentKey] = (header[currentKey] + joiner + line.trim()).trim()
    }
  }

  const body = bodyLines.join("\n").replace(/^\n+/, "").trimEnd()

  const fallbackTitle =
    String(fileName).replace(/\.[^.]+$/, "").trim() ||
    (body.split("\n").find((l) => l.trim()) || "Untitled").trim().slice(0, 80)

  return {
    title: header.title || fallbackTitle,
    description: header.description,
    url: header.url,
    text: body,
    hasHeader: headerLines.length > 0,
  }
}

// Returns the URL only if it is a plain http(s) link, so a hostile file can't
// smuggle a javascript: URL into an <a href>.
export function safeHttpUrl(value) {
  try {
    const u = new URL(String(value).trim())
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : ""
  } catch {
    return ""
  }
}

// Used to recognise a re-upload of the same story so it updates in place
// instead of creating a duplicate.
export function sourceKeyFor({ url, title }) {
  const u = safeHttpUrl(url)
  return u ? `url:${u}` : `title:${String(title).trim().toLowerCase()}`
}

export function countWords(text) {
  const m = String(text).match(/\S+/g)
  return m ? m.length : 0
}

// Decode uploaded bytes. Handles UTF-8 (with/without BOM) and UTF-16 BOMs,
// which Windows tools like PowerShell's `>` redirect can produce.
export function decodeTextBytes(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes.subarray(2))
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes.subarray(2))
  return new TextDecoder("utf-8").decode(bytes)
}

// Cheap guard against someone uploading an image/zip by mistake.
export function looksLikeText(text) {
  if (!text) return false
  const sample = text.slice(0, 4000)
  let bad = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 0 || c === 0xfffd) bad++
  }
  return bad / sample.length < 0.02
}
