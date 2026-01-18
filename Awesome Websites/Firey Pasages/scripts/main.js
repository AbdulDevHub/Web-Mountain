// DOM Elements
const audio = document.getElementById("audio")
const canvas = document.getElementById("visualizer")
const ctx = canvas.getContext("2d")
const storySelect = document.getElementById("storySelect")
const storyText = document.getElementById("storyText")
const storyTitle = document.getElementById("storyTitle")
const playPause = document.getElementById("playPause")
const rewindBtn = document.getElementById("rewind")
const timeDisplay = document.getElementById("timeDisplay")
const seekBar = document.getElementById("seekBar")
const muteBtn = document.getElementById("mute")
const speedValue = document.getElementById("speed-value")
const decSpeed = document.getElementById("decrease-speed-btn")
const incSpeed = document.getElementById("increase-speed-btn")
const fontInc = document.getElementById("font-inc")
const fontDec = document.getElementById("font-dec")

// State
let fontSize = 0.95
let audioCtx, analyser, dataArray

// Audio Visualizer
function setupVisualizer() {
  if (audioCtx) return

  audioCtx = new AudioContext()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 64
  dataArray = new Uint8Array(analyser.frequencyBinCount)

  const source = audioCtx.createMediaElementSource(audio)
  source.connect(analyser)
  analyser.connect(audioCtx.destination)

  draw()
}

function draw() {
  requestAnimationFrame(draw)
  analyser.getByteFrequencyData(dataArray)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const barWidth = canvas.width / dataArray.length
  dataArray.forEach((value, index) => {
    ctx.fillStyle = `rgb(${value + 50}, 100, 200)`
    ctx.fillRect(
      index * barWidth,
      canvas.height - value * 0.5,
      barWidth - 2,
      value * 0.5
    )
  })
}

// Playback Controls
playPause.onclick = async () => {
  if (!audioCtx) setupVisualizer()

  if (audio.paused) {
    await audioCtx.resume()
    audio.play()
    playPause.textContent = "⏸"
  } else {
    audio.pause()
    playPause.textContent = "▶"
  }
}

rewindBtn.onclick = () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10)
}

muteBtn.onclick = () => {
  audio.muted = !audio.muted
  muteBtn.textContent = audio.muted ? "🔇" : "🔊"
}

// Speed Controls
function updateSpeed(delta) {
  audio.playbackRate = Math.min(2, Math.max(0.5, audio.playbackRate + delta))
  speedValue.textContent = audio.playbackRate.toFixed(2)
}

decSpeed.onclick = () => updateSpeed(-0.1)
incSpeed.onclick = () => updateSpeed(0.1)

// Font Size Controls
fontInc.onclick = () => {
  fontSize = Math.min(1.5, fontSize + 0.1)
  storyText.style.fontSize = `${fontSize}rem`
}

fontDec.onclick = () => {
  fontSize = Math.max(0.75, fontSize - 0.1)
  storyText.style.fontSize = `${fontSize}rem`
}

// Progress Bar and Time Display
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

function updateProgress() {
  const duration = audio.duration || 0
  const currentTime = audio.currentTime
  const progress = duration ? (currentTime / duration) * 100 : 0

  seekBar.max = duration
  seekBar.value = currentTime
  seekBar.style.setProperty("--progress", `${progress}%`)

  timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(
    duration
  )}`
}

audio.ontimeupdate = updateProgress
seekBar.oninput = () => {
  audio.currentTime = seekBar.value
}

// Story Loading
async function loadStory(name) {
  const safeName = encodeURIComponent(name)

  audio.src = `${safeName}.mp3`
  playPause.textContent = "▶"
  storyTitle.textContent = name

  const response = await fetch(`${safeName}.txt`)
  storyText.textContent = await response.text()
  storyText.scrollTop = 0
}

storySelect.onchange = (e) => loadStory(e.target.value)
loadStory(storySelect.value)
audio.addEventListener("loadedmetadata", updateProgress)

// Horizontal to Vertical Scroll Remapper
function findScrollableParent(element) {
  while (element && element !== document.body) {
    const style = getComputedStyle(element)
    const overflowY = style.overflowY

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight
    ) {
      return element
    }
    element = element.parentElement
  }
  return null
}

window.addEventListener(
  "wheel",
  (e) => {
    // Only remap horizontal scrolling
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (!target) return

    const scrollable = findScrollableParent(target)
    e.preventDefault()

    if (scrollable) {
      scrollable.scrollTop += e.deltaX
    } else {
      window.scrollBy({ top: e.deltaX, left: 0, behavior: "auto" })
    }
  },
  { passive: false }
)

// Keyboard Shortcuts
window.addEventListener("keydown", async (e) => {
  // Ignore typing inside inputs / selects
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  ) {
    return
  }

  switch (e.key.toLowerCase()) {
    case " ":
      e.preventDefault()
      playPause.click()
      break

    case "arrowleft":
      audio.currentTime = Math.max(0, audio.currentTime - 10)
      break

    case "arrowright":
      audio.currentTime = Math.min(
        audio.duration || Infinity,
        audio.currentTime + 10
      )
      break

    case "a":
      setSpeed(1)
      break

    case "q":
      setSpeed(1.5)
      break

    case "w":
      setSpeed(2)
      break

    case "e":
      setSpeed(2.5)
      break

    case "r":
      setSpeed(3)
      break

    case "t":
      setSpeed(4)
      break
  }
})

// Helper to set speed cleanly
function setSpeed(value) {
  audio.playbackRate = value
  speedValue.textContent = value.toFixed(2)
}
