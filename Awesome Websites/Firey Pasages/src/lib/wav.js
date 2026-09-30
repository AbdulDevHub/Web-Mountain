// Small helpers for turning the TTS model's Float32 output into playable,
// compact 16-bit mono WAV blobs (48 KB per second of audio at 24 kHz).

// Trim the model's leading/trailing near-silence so that pauses between
// chunks are the ones we choose (see PAUSE in chunker.js), not whatever the
// model happened to emit. A margin is kept so soft consonants aren't clipped.
export function trimSilence(samples, sampleRate, { threshold = 0.008, leadSec = 0.04, tailSec = 0.06 } = {}) {
  let first = -1
  let last = -1
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      if (first < 0) first = i
      last = i
    }
  }
  if (first < 0) return samples.subarray(0, Math.min(samples.length, Math.round(sampleRate * 0.1)))
  const start = Math.max(0, first - Math.round(leadSec * sampleRate))
  const end = Math.min(samples.length, last + 1 + Math.round(tailSec * sampleRate))
  return samples.subarray(start, end)
}

// Float32 [-1, 1] -> 16-bit PCM WAV, with `padSeconds` of silence appended.
export function encodeWav(samples, sampleRate, padSeconds = 0) {
  const padN = Math.max(0, Math.round(padSeconds * sampleRate))
  const total = samples.length + padN
  const buffer = new ArrayBuffer(44 + total * 2)
  const dv = new DataView(buffer)
  const writeTag = (offset, s) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i))
  }
  writeTag(0, "RIFF")
  dv.setUint32(4, 36 + total * 2, true)
  writeTag(8, "WAVE")
  writeTag(12, "fmt ")
  dv.setUint32(16, 16, true) // fmt chunk size
  dv.setUint16(20, 1, true) // PCM
  dv.setUint16(22, 1, true) // mono
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true) // byte rate
  dv.setUint16(32, 2, true) // block align
  dv.setUint16(34, 16, true) // bits per sample
  writeTag(36, "data")
  dv.setUint32(40, total * 2, true)

  let o = 44
  for (let i = 0; i < samples.length; i++, o += 2) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    dv.setInt16(o, Math.round(v < 0 ? v * 32768 : v * 32767), true)
  }
  // remaining bytes are already zero = silence
  return { blob: new Blob([buffer], { type: "audio/wav" }), duration: total / sampleRate }
}
