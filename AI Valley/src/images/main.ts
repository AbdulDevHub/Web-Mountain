import "../shared/theme.css"
import "./style.css"
import { chat, SignInRequired } from "../shared/ai-client"
import { hideSignInNotice, initAccess, showSignInNotice } from "../shared/access"
import { $, el, errorMessage } from "../shared/dom"

type Tab = "generate" | "remix"

// Each style adds wording to the prompt; "colorize" only makes sense for remixing
const STYLES: { id: string; label: string; prompt: string; remixOnly?: boolean }[] = [
  { id: "none", label: "No style", prompt: "" },
  { id: "photo", label: "Photo", prompt: "photorealistic, natural light, 35mm photograph, highly detailed" },
  { id: "watercolor", label: "Watercolor", prompt: "soft watercolor painting, loose brush strokes, paper texture" },
  { id: "anime", label: "Anime", prompt: "anime illustration, clean line art, vibrant cel shading" },
  { id: "pixel", label: "Pixel art", prompt: "16-bit pixel art, limited palette, crisp pixels" },
  { id: "oil", label: "Oil painting", prompt: "classical oil painting, rich textures, dramatic lighting" },
  { id: "noir", label: "Film noir", prompt: "black and white film noir, high contrast, moody shadows" },
  { id: "cyberpunk", label: "Cyberpunk", prompt: "cyberpunk, neon lights, rainy night, cinematic" },
  { id: "colorize", label: "Colorize old photo", prompt: "restored and colorized vintage photograph, natural realistic colors, sharp details", remixOnly: true },
]

const tabGenerate = $<HTMLButtonElement>("tab-generate")
const tabRemix = $<HTMLButtonElement>("tab-remix")
const panelGenerate = $<HTMLDivElement>("panel-generate")
const panelRemix = $<HTMLDivElement>("panel-remix")
const promptInput = $<HTMLTextAreaElement>("prompt")
const titleInput = $<HTMLInputElement>("title")
const promptField = $<HTMLLabelElement>("prompt-field")
const titleField = $<HTMLLabelElement>("title-field")
const remixFile = $<HTMLInputElement>("remix-file")
const remixPreview = $<HTMLImageElement>("remix-preview")
const stylesBox = $<HTMLDivElement>("styles")
const aspectsBox = $<HTMLDivElement>("aspects")
const goBtn = $<HTMLButtonElement>("go")
const statusLabel = $<HTMLParagraphElement>("status")
const noticeSlot = $<HTMLDivElement>("notice-slot")
const canvas = $<HTMLDivElement>("canvas")
const usedPrompt = $<HTMLParagraphElement>("used-prompt")
const download = $<HTMLAnchorElement>("download")

let tab: Tab = "generate"
let style = "none"
let aspect = "square"
let remixDataUrl: string | null = null
let lastObjectUrl: string | null = null

// ---------- Controls ----------

function renderStyles() {
  const visible = STYLES.filter((s) => tab === "remix" || !s.remixOnly)
  if (!visible.some((s) => s.id === style)) style = "none"
  stylesBox.replaceChildren(
    ...visible.map((s) => {
      const b = el("button", "", s.label)
      b.type = "button"
      b.setAttribute("aria-pressed", String(s.id === style))
      b.addEventListener("click", () => {
        style = s.id
        renderStyles()
      })
      return b
    }),
  )
}

function setTab(next: Tab) {
  tab = next
  tabGenerate.setAttribute("aria-selected", String(tab === "generate"))
  tabRemix.setAttribute("aria-selected", String(tab === "remix"))
  panelGenerate.hidden = tab !== "generate"
  panelRemix.hidden = tab !== "remix"
  goBtn.textContent = tab === "generate" ? "Generate" : "Remix photo"
  if (tab === "remix" && style === "none") style = "colorize"
  renderStyles()
}

tabGenerate.addEventListener("click", () => setTab("generate"))
tabRemix.addEventListener("click", () => setTab("remix"))

for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
  radio.addEventListener("change", () => {
    const poster = radio.value === "poster" && radio.checked
    promptField.hidden = poster
    titleField.hidden = !poster
  })
}

aspectsBox.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-aspect]")
  if (!b) return
  aspect = b.dataset.aspect!
  for (const other of aspectsBox.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b))
})

remixFile.addEventListener("change", () => {
  const file = remixFile.files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    // Shrink before sending to the vision model
    const scale = Math.min(1, 1024 / Math.max(img.width, img.height))
    const c = document.createElement("canvas")
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
    remixDataUrl = c.toDataURL("image/jpeg", 0.85)
    remixPreview.src = remixDataUrl
    remixPreview.hidden = false
    URL.revokeObjectURL(img.src)
  }
  img.src = URL.createObjectURL(file)
})

// ---------- Prompt building ----------

const styleText = () => STYLES.find((s) => s.id === style)?.prompt ?? ""

function textPrompt(): string {
  const poster = document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value === "poster"
  if (poster) {
    const title = titleInput.value.trim()
    if (!title) throw new Error("Enter a movie title for the poster.")
    return `A striking theatrical movie poster for a film titled "${title}", with the title in bold lettering, cinematic composition${styleText() ? `, ${styleText()}` : ""}`
  }
  const prompt = promptInput.value.trim()
  if (!prompt) throw new Error("Describe what you want to see.")
  return styleText() ? `${prompt}, ${styleText()}` : prompt
}

async function remixPrompt(): Promise<string> {
  if (!remixDataUrl) throw new Error("Choose a photo to remix first.")
  statusLabel.textContent = "Describing your photo…"
  const colorize = style === "colorize"
  const { message } = await chat({
    temperature: 0.4,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Describe this image as a single detailed prompt for an image generator (max 90 words): subjects, " +
              "composition, setting, clothing, lighting." +
              (colorize ? " The photo may be black and white: describe realistic, era-appropriate colors for everything." : "") +
              " Reply with only the prompt.",
          },
          { type: "image_url", image_url: { url: remixDataUrl } },
        ],
      },
    ],
  })
  const description = message.content?.trim()
  if (!description) throw new Error("The vision model couldn't describe the photo. Try again.")
  return styleText() ? `${description}, ${styleText()}` : description
}

// ---------- Generation ----------

const SIZES: Record<string, [number, number]> = { square: [1024, 1024], portrait: [832, 1216], landscape: [1216, 832] }

// Server path first (uses the site's Pollinations token if one is set). If that
// fails, e.g. the anonymous quota of Netlify's shared IPs is used up, the browser
// asks Pollinations directly, which counts against the visitor's own anonymous quota.
async function generateImage(prompt: string): Promise<string> {
  try {
    const res = await fetch("/api/image-gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspect }),
    })
    if (res.ok) return URL.createObjectURL(await res.blob())
  } catch {
    // Network error: try the direct route
  }
  const [width, height] = SIZES[aspect]
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(Math.floor(Math.random() * 1_000_000)),
    model: "flux",
    nologo: "true",
    referrer: "ai-valley",
  })
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
  await new Promise<void>((resolve, reject) => {
    const probe = new Image()
    probe.onload = () => resolve()
    probe.onerror = () => reject(new Error("The free image service is busy right now. Try again in a minute."))
    probe.src = url
  })
  return url
}

async function run() {
  goBtn.disabled = true
  hideSignInNotice(noticeSlot)
  statusLabel.textContent = ""
  try {
    const prompt = tab === "generate" ? textPrompt() : await remixPrompt()
    statusLabel.textContent = "Painting… (free models take 5-20 seconds)"
    canvas.dataset.busy = "true"
    const src = await generateImage(prompt)
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl)
    lastObjectUrl = src.startsWith("blob:") ? src : null
    const img = el("img")
    img.src = src
    img.alt = prompt
    canvas.replaceChildren(img)
    usedPrompt.textContent = `Prompt: ${prompt}`
    download.href = src // cross-origin fallback images open in a new tab instead of downloading
    download.target = lastObjectUrl ? "" : "_blank"
    download.hidden = false
    statusLabel.textContent = ""
  } catch (err) {
    if (err instanceof SignInRequired) showSignInNotice(noticeSlot, err.reason)
    else statusLabel.textContent = errorMessage(err)
  } finally {
    canvas.dataset.busy = "false"
    goBtn.disabled = false
  }
}

goBtn.addEventListener("click", run)
setTab("generate")
void initAccess($("account"), (message) => (statusLabel.textContent = message))
