// Free LLM proxy for AI Valley apps: forwards chat requests to OpenRouter's free
// models using the site's key (OPENROUTER_API_KEY env var), so visitors can try
// the apps without an account. The model list is fixed here, never taken from
// the client, and inputs are validated and size-capped.
//
// Status codes the client relies on:
//   402 = shared daily free quota used up -> client offers "Sign in with OpenRouter"
//   429 = per-minute rate limit (Netlify's or OpenRouter's) -> client says "slow down"
//   503 = no key configured

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
// openrouter/free routes to whichever free model is available (usually answers
// in 1-2s on live tests); the named models are fallbacks if the router fails
const DEFAULT_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
]

const MAX_MESSAGES = 40
const MAX_TEXT_CHARS = 24_000 // all text parts combined
const MAX_IMAGES = 2
const MAX_IMAGE_URL_CHARS = 1_500_000 // one downscaled data: URL (Vision Lab)
const MAX_TOOLS_CHARS = 12_000
const MAX_TOKENS = 2048
const UPSTREAM_TIMEOUT_MS = 24_000 // total budget, under Netlify's function time limit
const FIRST_ATTEMPT_TIMEOUT_MS = 11_000 // a slow free model gets dropped, leaving time to retry
const RETRY_MIN_REMAINING_MS = 8_000

const ROLES = new Set(["system", "user", "assistant", "tool"])

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true // non-browser clients; Netlify's rate limit still applies
  try {
    return new URL(origin).host === new URL(req.url).host
  } catch {
    return false // e.g. "Origin: null" from sandboxed iframes or file://
  }
}

// Returns an error message, or null when the messages are acceptable
function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return `messages must be an array of 1-${MAX_MESSAGES} items`
  }
  let textChars = 0
  let images = 0
  for (const m of messages) {
    if (typeof m !== "object" || m === null || !ROLES.has((m as { role?: string }).role ?? "")) {
      return "Each message needs a valid role"
    }
    const { content } = m as { content?: unknown }
    if (typeof content === "string") {
      textChars += content.length
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === "text" && typeof part.text === "string") {
          textChars += part.text.length
        } else if (part?.type === "image_url" && typeof part.image_url?.url === "string") {
          const url: string = part.image_url.url
          if (++images > MAX_IMAGES || url.length > MAX_IMAGE_URL_CHARS) return "Too many or too large images"
          if (!/^(data:image\/|https:\/\/)/.test(url)) return "Images must be data: or https: URLs"
        } else {
          return "Unsupported content part"
        }
      }
    } else if (content !== null && content !== undefined) {
      return "Unsupported message content"
    }
  }
  return textChars > MAX_TEXT_CHARS ? "Text too long" : null
}

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST" })
  if (!sameOrigin(req)) return json(403, { error: "Cross-site requests are not allowed" })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return json(503, { error: "proxy_not_configured" })

  let input: { messages?: unknown; tools?: unknown; max_tokens?: unknown; temperature?: unknown }
  try {
    input = await req.json()
  } catch {
    return json(400, { error: "Invalid JSON" })
  }

  const invalid = validateMessages(input.messages)
  if (invalid) return json(400, { error: invalid })

  const tools = Array.isArray(input.tools) ? input.tools : undefined
  if (tools && JSON.stringify(tools).length > MAX_TOOLS_CHARS) return json(400, { error: "Tool definitions too large" })

  const models = process.env.AI_VALLEY_MODELS?.split(",").map((m) => m.trim()).filter(Boolean) ?? DEFAULT_MODELS
  const requested = typeof input.max_tokens === "number" ? Math.floor(input.max_tokens) : MAX_TOKENS
  const maxTokens = Math.min(Math.max(requested, 1), MAX_TOKENS)
  const temperature =
    typeof input.temperature === "number" ? Math.min(Math.max(input.temperature, 0), 2) : undefined

  const started = Date.now()
  let lastError = "The AI service didn't respond in time. Try again."

  // A free model can be slow, fail mid-request or return nothing. If there's
  // time left, retry once with the model list rotated so another model goes first.
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = UPSTREAM_TIMEOUT_MS - (Date.now() - started)
    if (attempt > 0 && remaining < RETRY_MIN_REMAINING_MS) break
    const order = [...models.slice(attempt), ...models.slice(0, attempt)]

    let status: number
    let text: string
    try {
      const upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: AbortSignal.timeout(attempt === 0 ? Math.min(remaining, FIRST_ATTEMPT_TIMEOUT_MS) : remaining),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": new URL(req.url).origin,
          "X-Title": "AI Valley",
        },
        body: JSON.stringify({
          model: order[0],
          models: order,
          messages: input.messages,
          ...(tools && { tools }),
          ...(temperature !== undefined && { temperature }),
          max_tokens: maxTokens,
          // Keep reasoning models quick, and don't send their reasoning to the browser
          reasoning: { effort: "low", exclude: true },
        }),
      })
      status = upstream.status
      // Buffer the whole reply: OpenRouter sends keep-alive whitespace first, so a
      // streamed pass-through could reach the browser cut off if time runs out
      text = await upstream.text()
    } catch {
      lastError = "The AI service didn't respond in time. Try again."
      continue
    }

    const outcome = classify(status, text)
    if (outcome.kind === "ok") return new Response(outcome.body, { headers: { "Content-Type": "application/json" } })
    if (outcome.kind === "final") return json(outcome.status, outcome.body)
    lastError = outcome.message
  }

  return json(502, { error: lastError })
}

type Outcome =
  | { kind: "ok"; body: string }
  | { kind: "final"; status: number; body: unknown } // pass to the client as-is
  | { kind: "retry"; message: string }

function quotaOrRateLimit(code: number, text: string): Outcome {
  // OpenRouter uses 429 for both per-minute and per-day free limits; only the
  // daily one (or a 402 credit problem) should push visitors to sign in
  const daily = code === 402 || /per-day|per day|daily/i.test(text)
  return daily
    ? { kind: "final", status: 402, body: { error: "quota" } }
    : { kind: "final", status: 429, body: { error: "rate_limited" } }
}

function classify(status: number, text: string): Outcome {
  if (status === 429 || status === 402) return quotaOrRateLimit(status, text)

  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return { kind: "retry", message: "The AI service sent an incomplete reply. Try again." }
  }

  // Errors that happen after OpenRouter has started replying arrive with status 200
  const error = data?.error ?? data?.choices?.[0]?.error
  if (error) {
    const code = Number(error.code)
    if (code === 429 || code === 402) return quotaOrRateLimit(code, JSON.stringify(error))
    if (status >= 400 && status < 500) return { kind: "final", status, body: data }
    return { kind: "retry", message: typeof error.message === "string" ? error.message : "The AI service failed. Try again." }
  }
  if (status >= 400) return { kind: "final", status, body: data }

  const message = data?.choices?.[0]?.message
  if (!message?.tool_calls?.length && !message?.content?.trim()) {
    return { kind: "retry", message: "The model returned an empty response. Try again." }
  }
  return { kind: "ok", body: text.trim() }
}

export const config = {
  path: "/api/ai-chat",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip", "domain"],
    windowSize: 60,
    windowLimit: 10,
  },
}
