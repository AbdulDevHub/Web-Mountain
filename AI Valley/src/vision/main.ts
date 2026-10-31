import "../shared/theme.css"
import "./style.css"
import { env, pipeline, type ObjectDetectionPipeline } from "@huggingface/transformers"
import sampleUrl from "./sample.jpeg"
import { chat, SignInRequired } from "../shared/ai-client"
import { hideSignInNotice, initAccess, showSignInNotice } from "../shared/access"
import { $, el, errorMessage, plainText } from "../shared/dom"

env.allowLocalModels = false

const DETECTION_MODEL = "Xenova/yolos-tiny"
const DETECT_THRESHOLD = 0.85
const MAX_SIDE = 1024 // px, for images sent to the vision model
const COLORS = ["#8b7bff", "#4fd1c5", "#f6b44b", "#ff7eb6", "#5ee0a0", "#7c9cff"]

const image = $<HTMLImageElement>("image")
const video = $<HTMLVideoElement>("video")
const boxes = $<HTMLDivElement>("boxes")
const fileInput = $<HTMLInputElement>("file")
const webcamBtn = $<HTMLButtonElement>("webcam")
const captureBtn = $<HTMLButtonElement>("capture")
const detectBtn = $<HTMLButtonElement>("detect")
const detectStatus = $<HTMLSpanElement>("detect-status")
const objectsList = $<HTMLDivElement>("objects")
const askForm = $<HTMLFormElement>("ask-form")
const question = $<HTMLInputElement>("question")
const askBtn = $<HTMLButtonElement>("ask")
const answer = $<HTMLDivElement>("answer")
const noticeSlot = $<HTMLDivElement>("notice-slot")

let stream: MediaStream | null = null

// ---------- Image sources ----------

function setImage(src: string) {
  stopWebcam()
  image.src = src
  boxes.replaceChildren()
  objectsList.replaceChildren()
  answer.textContent = ""
}

function stopWebcam() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  video.hidden = true
  captureBtn.hidden = true
  webcamBtn.textContent = "Use webcam"
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => setImage(String(reader.result))
  reader.readAsDataURL(file)
  fileInput.value = ""
})

$("sample").addEventListener("click", () => setImage(sampleUrl))

webcamBtn.addEventListener("click", async () => {
  if (stream) return stopWebcam()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } } })
    video.srcObject = stream
    await video.play()
    image.removeAttribute("src")
    boxes.replaceChildren()
    video.hidden = false
    captureBtn.hidden = false
    webcamBtn.textContent = "Stop webcam"
  } catch {
    detectStatus.textContent = "Couldn't open the webcam (permission denied or no camera)."
  }
})

captureBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext("2d")!.drawImage(video, 0, 0)
  setImage(canvas.toDataURL("image/jpeg", 0.9))
})

// ---------- Object detection (in the browser) ----------

// WebGPU when the browser has it, otherwise the 8-bit quantized model on WASM
// (the default full-precision model is several times slower on CPU)
const detectorReady = (
  "gpu" in navigator
    ? pipeline("object-detection", DETECTION_MODEL, { device: "webgpu", dtype: "fp32" }).catch(() =>
        pipeline("object-detection", DETECTION_MODEL, { dtype: "q8" }),
      )
    : pipeline("object-detection", DETECTION_MODEL, { dtype: "q8" })
) as Promise<ObjectDetectionPipeline>

detectorReady
  .then(() => {
    detectBtn.disabled = false
    detectStatus.textContent = "Detector ready."
  })
  .catch((err) => {
    detectStatus.textContent = `Couldn't load the detector: ${errorMessage(err)}`
  })

interface Detection {
  label: string
  score: number
  box: { xmin: number; ymin: number; xmax: number; ymax: number }
}

detectBtn.addEventListener("click", async () => {
  if (!image.getAttribute("src")) {
    detectStatus.textContent = "Pick a photo first."
    return
  }
  detectBtn.disabled = true
  detectStatus.textContent = "Detecting… (the first run can take a while on devices without a GPU)"
  try {
    const detector = await detectorReady
    const started = performance.now()
    const results = (await detector(image.src, { threshold: DETECT_THRESHOLD, percentage: true })) as Detection[]
    drawBoxes(results)
    const ms = Math.round(performance.now() - started)
    detectStatus.textContent = results.length
      ? `Found ${results.length} object${results.length === 1 ? "" : "s"} in ${ms} ms, on your device.`
      : "No objects found above 85% confidence."
  } catch (err) {
    detectStatus.textContent = `Detection failed: ${errorMessage(err)}`
  } finally {
    detectBtn.disabled = false
  }
})

function drawBoxes(results: Detection[]) {
  boxes.replaceChildren()
  objectsList.replaceChildren()
  const counts = new Map<string, number>()
  results.forEach(({ label, score, box }, i) => {
    const color = COLORS[i % COLORS.length]
    const node = el("div", "box")
    node.style.setProperty("--box-color", color)
    Object.assign(node.style, {
      left: `${box.xmin * 100}%`,
      top: `${box.ymin * 100}%`,
      width: `${(box.xmax - box.xmin) * 100}%`,
      height: `${(box.ymax - box.ymin) * 100}%`,
    })
    node.append(el("span", "", `${label} ${Math.round(score * 100)}%`))
    boxes.append(node)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  for (const [label, count] of counts) objectsList.append(el("span", "", count > 1 ? `${label} × ${count}` : label))
}

// ---------- Ask a vision model ----------

async function imageAsDataUrl(): Promise<string> {
  await image.decode()
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.8)
}

async function ask(text: string) {
  const q = text.trim()
  if (!q || askBtn.disabled) return
  if (!image.getAttribute("src")) {
    answer.dataset.error = "true"
    answer.textContent = "Pick a photo first."
    return
  }
  askBtn.disabled = true
  hideSignInNotice(noticeSlot)
  answer.dataset.error = "false"
  answer.textContent = "Looking at the image…"
  try {
    const detected = [...objectsList.children].map((c) => c.textContent).join(", ")
    const { message } = await chat({
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: "You are a helpful vision assistant. Answer questions about the image concisely, in plain text.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: detected ? `${q}\n\n(An object detector found: ${detected}.)` : q },
            { type: "image_url", image_url: { url: await imageAsDataUrl() } },
          ],
        },
      ],
    })
    answer.textContent = plainText(message.content ?? "") || "The model didn't say anything. Try again."
  } catch (err) {
    answer.textContent = ""
    if (err instanceof SignInRequired) showSignInNotice(noticeSlot, err.reason)
    else {
      answer.dataset.error = "true"
      answer.textContent = errorMessage(err)
    }
  } finally {
    askBtn.disabled = false
  }
}

askForm.addEventListener("submit", (e) => {
  e.preventDefault()
  void ask(question.value)
})
document.querySelector(".quick")!.addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest("button")
  if (button) {
    question.value = button.textContent ?? ""
    void ask(question.value)
  }
})

setImage(sampleUrl)
void initAccess($("account"), (message) => {
  answer.dataset.error = "true"
  answer.textContent = message
})
