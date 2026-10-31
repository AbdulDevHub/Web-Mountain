// Free image generation for Image Studio via Pollinations (Flux model).
// Works anonymously (rate-limited); set POLLINATIONS_TOKEN for higher limits and
// no watermark. The token stays on the server.
// POST /api/image-gen { prompt, aspect: "square" | "portrait" | "landscape", seed? } -> image/jpeg

const SIZES: Record<string, [number, number]> = {
  square: [1024, 1024],
  portrait: [832, 1216],
  landscape: [1216, 832],
}
const MAX_PROMPT = 1500
const TIMEOUT_MS = 24_000

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Use POST" })
  const origin = req.headers.get("origin")
  try {
    if (origin && new URL(origin).host !== new URL(req.url).host) throw new Error()
  } catch {
    return json(403, { error: "Cross-site requests are not allowed" })
  }

  let input: { prompt?: unknown; aspect?: unknown; seed?: unknown }
  try {
    input = await req.json()
  } catch {
    return json(400, { error: "Invalid JSON" })
  }
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : ""
  if (!prompt || prompt.length > MAX_PROMPT) return json(400, { error: `Prompt must be 1-${MAX_PROMPT} characters` })
  const [width, height] = SIZES[String(input.aspect)] ?? SIZES.square
  const seed = Number.isInteger(input.seed) ? Number(input.seed) : Math.floor(Math.random() * 1_000_000)

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: "flux",
    nologo: "true",
    referrer: "ai-valley",
  })
  const token = process.env.POLLINATIONS_TOKEN
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`

  let res: Response
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    return json(502, { error: "The image service took too long. Try again." })
  }
  if (res.status === 429) return json(429, { error: "The free image service is busy. Wait a few seconds and try again." })
  const type = res.headers.get("content-type") ?? ""
  if (!res.ok || !type.startsWith("image/")) return json(502, { error: `Image generation failed (${res.status})` })

  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": type, "X-Seed": String(seed) },
  })
}

export const config = {
  path: "/api/image-gen",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip", "domain"],
    windowSize: 60,
    windowLimit: 6,
  },
}
