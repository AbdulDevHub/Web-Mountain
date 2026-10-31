// Shared LLM access for every AI Valley app.
// 1. Visitors who signed in with OpenRouter call OpenRouter directly with their own key.
// 2. Everyone else goes through the site's free proxy (/api/ai-chat).
// 3. When the proxy is out of free quota (or not set up), callers get SignInRequired
//    and can offer "Sign in with OpenRouter" (OAuth PKCE, no key copy-pasting).

// Keep in sync with DEFAULT_MODELS in netlify/functions/ai-chat.mts
export const FREE_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
]

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const PROXY_URL = "/api/ai-chat"
const KEY_STORAGE = "ai-valley:openrouter-key"
const PKCE_STORAGE = "ai-valley:pkce"

export type ChatMessage =
  | { role: "system" | "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string }

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

export interface ToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export interface ChatRequest {
  messages: ChatMessage[]
  tools?: unknown[]
  max_tokens?: number
  temperature?: number
}

export interface ChatResult {
  message: { content: string | null; tool_calls?: ToolCall[] }
  model: string
  /** The reply hit the max_tokens limit and was cut off */
  truncated: boolean
}

export type SignInReason = "quota" | "not-configured" | "key-rejected"

export class SignInRequired extends Error {
  constructor(public reason: SignInReason) {
    super(`Sign in required: ${reason}`)
  }
}

function read(store: Storage, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function write(store: Storage, key: string, value: string | null) {
  try {
    if (value === null) store.removeItem(key)
    else store.setItem(key, value)
  } catch {
    // Storage blocked (private mode etc.): sign-in just won't persist
  }
}

export function getUserKey(): string | null {
  return read(localStorage, KEY_STORAGE)
}

export function signOut() {
  write(localStorage, KEY_STORAGE, null)
}

export async function chat(request: ChatRequest): Promise<ChatResult> {
  const userKey = getUserKey()
  // Signed-in visitors still default to free models so their credits aren't spent
  const body = JSON.stringify(
    userKey
      ? { ...request, model: FREE_MODELS[0], models: FREE_MODELS, reasoning: { effort: "low", exclude: true } }
      : request,
  )

  const res = userKey
    ? await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userKey}`,
          "Content-Type": "application/json",
          "X-Title": "AI Valley",
        },
        body,
      })
    : await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })

  if (userKey && res.status === 401) {
    signOut()
    throw new SignInRequired("key-rejected")
  }
  if (res.status === 429) throw new Error("Too many requests right now. Wait a few seconds and try again.")
  if (userKey && res.status === 402) {
    throw new Error("Your OpenRouter account is out of credits or over its limit. Check openrouter.ai/settings.")
  }
  // 402 from the proxy = the shared daily free quota is used up
  if (!userKey && res.status === 402) throw new SignInRequired("quota")
  // 401 = the site's own key is missing or revoked; 404/405/501 = no proxy at all
  // (e.g. a plain static host). Neither is the visitor's fault.
  if (!userKey && [401, 404, 405, 501, 503].includes(res.status)) throw new SignInRequired("not-configured")

  const data = await res.json().catch(() => null)
  if (!data) throw new Error("The AI service sent an incomplete reply. Try again.")

  // OpenRouter reports errors that happen mid-request inside a 200 response
  const error = data.error ?? data.choices?.[0]?.error
  if (!res.ok || error) {
    if (Number(error?.code) === 429) throw new Error("The free models are busy right now. Wait a few seconds and try again.")
    const message = error?.message ?? error ?? `Request failed (${res.status})`
    throw new Error(typeof message === "string" ? message : `Request failed (${res.status})`)
  }

  const choice = data.choices?.[0]
  if (!choice?.message) throw new Error("The model returned an empty response. Try again.")
  return { message: choice.message, model: data.model ?? "unknown", truncated: choice.finish_reason === "length" }
}

// ---------- Sign in with OpenRouter (OAuth PKCE) ----------

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function randomString(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)))
}

function callbackUrl(): string {
  return location.origin + location.pathname
}

export async function startSignIn() {
  const verifier = randomString()
  const state = randomString()
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  write(sessionStorage, PKCE_STORAGE, JSON.stringify({ verifier, state }))

  const url = new URL("https://openrouter.ai/auth")
  url.searchParams.set("callback_url", callbackUrl())
  url.searchParams.set("code_challenge", base64url(digest))
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("state", state)
  url.searchParams.set("key_label", "AI Valley")
  location.assign(url)
}

// Call once on page load. Returns true when a sign-in redirect was just completed.
export async function completeSignIn(): Promise<boolean> {
  const params = new URLSearchParams(location.search)
  const code = params.get("code")
  const pending = read(sessionStorage, PKCE_STORAGE)
  // No sign-in started in this tab: a ?code= here belongs to someone else, ignore it
  if (!code || !pending) return false

  let saved: { verifier?: string; state?: string } | null = null
  try {
    saved = JSON.parse(pending)
  } catch {
    // Corrupted record: treated as expired below
  }
  write(sessionStorage, PKCE_STORAGE, null)
  history.replaceState(null, "", callbackUrl())

  if (!saved?.verifier || params.get("state") !== saved.state) {
    throw new Error("Sign-in expired or came from another tab. Please try again.")
  }

  const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: saved.verifier, code_challenge_method: "S256" }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.key) throw new Error("OpenRouter sign-in failed. Please try again.")

  write(localStorage, KEY_STORAGE, data.key)
  return true
}
