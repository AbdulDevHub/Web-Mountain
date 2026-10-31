import "../shared/theme.css"
import "../shared/chat.css"
import "./style.css"
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers"
import moviesText from "./movies.txt?raw"
import { chat, SignInRequired, type ChatMessage } from "../shared/ai-client"
import { hideSignInNotice, initAccess, showSignInNotice } from "../shared/access"
import { $, el, errorMessage, scrollToEnd } from "../shared/dom"

// Models come from the Hugging Face CDN and are cached by the browser after the first visit
env.allowLocalModels = false

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2"
const TOP_K = 3
const MIN_SCORE = 0.15
const HISTORY_TURNS = 6

interface Movie {
  title: string
  details: string // "2023 | PG-13 | 1h 54m | 7.2 rating"
  text: string
  vector?: Float32Array
}

const log = $<HTMLDivElement>("log")
const form = $<HTMLFormElement>("form")
const input = $<HTMLInputElement>("input")
const sendBtn = $<HTMLButtonElement>("send")
const suggestions = $<HTMLDivElement>("suggestions")
const noticeSlot = $<HTMLDivElement>("notice-slot")

const history: ChatMessage[] = []

function add(node: HTMLElement) {
  log.append(node)
  scrollToEnd(log)
  return node
}

// ---------- Movie index ----------

function parseMovies(raw: string): Movie[] {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [header, ...rest] = block.split("\n")
      const match = header.match(/^(.*): (\d{4} \|.*)$/)
      return {
        title: match?.[1] ?? header,
        details: match?.[2] ?? "",
        text: `${header}\n${rest.join(" ")}`,
      }
    })
}

const movies = parseMovies(moviesText)
const catalog = movies.map((m) => `${m.title}: ${m.details}`).join("\n")
const status = add(el("div", "typing", "Loading the movie search model (about 23 MB, only the first time)"))

const indexReady: Promise<FeatureExtractionPipeline> = (async () => {
  const embedder = (await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" })) as FeatureExtractionPipeline
  for (const movie of movies) movie.vector = await embed(embedder, movie.text)
  return embedder
})()

indexReady
  .then(() => {
    status.remove()
    add(
      el(
        "div",
        "msg msg-bot",
        `Hey! I know ${movies.length} recent movies, from ${movies[0].title} to ${movies.at(-1)!.title}. Tell me what you're in the mood for.`,
      ),
    )
  })
  .catch((err) => {
    status.remove()
    add(el("div", "msg msg-error", `Couldn't load the search model: ${errorMessage(err)}. Try reloading.`))
  })

async function embed(embedder: FeatureExtractionPipeline, text: string): Promise<Float32Array> {
  const output = await embedder(text, { pooling: "mean", normalize: true })
  return output.data as Float32Array
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot // both vectors are normalized
}

async function retrieve(query: string): Promise<{ movie: Movie; score: number }[]> {
  const embedder = await indexReady
  const q = await embed(embedder, query)
  return movies
    .map((movie) => ({ movie, score: cosine(q, movie.vector!) }))
    .sort((a, b) => b.score - a.score)
    .filter((m, i) => i < TOP_K && m.score >= MIN_SCORE)
}

// ---------- RAG chat ----------

// Follow-ups ("is it scary?") are rewritten into standalone questions so retrieval works
async function standaloneQuestion(question: string): Promise<string> {
  if (history.length === 0) return question
  const convo = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
  try {
    const { message } = await chat({
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's latest question as one standalone question that makes sense without the conversation. " +
            "Keep movie titles. Reply with only the question.",
        },
        { role: "user", content: `Conversation:\n${convo}\n\nLatest question: ${question}` },
      ],
    })
    return message.content?.trim() || question
  } catch (err) {
    if (err instanceof SignInRequired) throw err
    return question // the rewrite is a nice-to-have; fall back to the raw question
  }
}

async function answer(question: string) {
  const typing = add(el("div", "typing", "Searching the shelf"))
  try {
    const query = await standaloneQuestion(question)
    const matches = await retrieve(query)
    typing.textContent = "Writing an answer"

    const context = matches.length
      ? matches.map(({ movie }) => movie.text).join("\n\n")
      : "(No matching movies.)"
    const { message, model } = await chat({
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are an enthusiastic movie expert chatting with a friend. Answer briefly using only the movie context " +
            "and the conversation. If the answer isn't there, say \"Sorry, I don't know that one.\" Never invent movies " +
            "or facts. Plain text, no markdown.\n\n" +
            // One line per movie so list-style questions ("highest rated?") work beyond the top matches
            `Full shelf (title: year | rating | runtime | score):\n${catalog}`,
        },
        ...history.slice(-HISTORY_TURNS * 2),
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
    })

    const reply = message.content?.trim() || "Sorry, I don't know that one."
    history.push({ role: "user", content: question }, { role: "assistant", content: reply })

    const bubble = add(el("div", "msg msg-bot", reply))
    if (matches.length) {
      const chips = el("div", "matches")
      for (const { movie, score } of matches) chips.append(el("span", "match", `${movie.title} · ${score.toFixed(2)}`))
      bubble.append(chips)
    }
    bubble.append(el("div", "msg-meta", query !== question ? `Searched for: "${query}" · ${model}` : model))
  } finally {
    typing.remove()
  }
}

async function send(text: string) {
  const question = text.trim()
  if (!question || sendBtn.disabled) return
  input.value = ""
  suggestions.hidden = true
  hideSignInNotice(noticeSlot)
  sendBtn.disabled = true
  add(el("div", "msg msg-user", question))
  try {
    await answer(question)
  } catch (err) {
    if (err instanceof SignInRequired) showSignInNotice(noticeSlot, err.reason)
    else add(el("div", "msg msg-error", errorMessage(err)))
  } finally {
    sendBtn.disabled = false
    input.focus()
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault()
  void send(input.value)
})
suggestions.addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest("button")
  if (button) void send(button.textContent ?? "")
})

void initAccess($("account"), (message) => add(el("div", "msg msg-error", message)))
