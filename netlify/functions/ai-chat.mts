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
const DEFAULT_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
]

const MAX_MESSAGES = 40
const MAX_TEXT_CHARS = 24_000 // all text parts combined
const MAX_IMAGES = 2
const MAX_IMAGE_URL_CHARS = 1_500_000 // one downscaled data: URL (Vision Lab)
const MAX_TOOLS_CHARS = 12_000
const MAX_TOKENS = 2048
const UPSTREAM_TIMEOUT_MS = 25_000

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

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": new URL(req.url).origin,
        "X-Title": "AI Valley",
      },
      body: JSON.stringify({
        model: models[0],
        models,
        messages: input.messages,
        ...(tools && { tools }),
        ...(temperature !== undefined && { temperature }),
        max_tokens: maxTokens,
      }),
    })
  } catch {
    return json(502, { error: "The AI service didn't respond in time. Try again." })
  }

  if (upstream.status === 429 || upstream.status === 402) {
    // OpenRouter uses 429 for both per-minute and per-day free limits; only the
    // daily one (or a 402 credit problem) should push visitors to sign in
    const text = await upstream.text()
    const daily = upstream.status === 402 || /per-day|per day|daily/i.test(text)
    return daily ? json(402, { error: "quota" }) : json(429, { error: "rate_limited" })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  })
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
