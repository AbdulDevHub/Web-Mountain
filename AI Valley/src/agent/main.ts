import "../shared/theme.css"
import "../shared/chat.css"
import "./style.css"
import { chat, SignInRequired, type ChatMessage } from "../shared/ai-client"
import { hideSignInNotice, initAccess, showSignInNotice } from "../shared/access"
import { $, el, errorMessage, plainText, scrollToEnd } from "../shared/dom"
import { runTool, TOOL_DEFS } from "./tools"

const MAX_STEPS = 6
const MAX_HISTORY = 30

const SYSTEM_PROMPT =
  "You are a helpful agent with tools. For live or exact facts (weather, current time or date, math, unit " +
  "conversions, encyclopedia facts) always call a tool instead of guessing. You may call several tools in a row. " +
  "When you call a tool, put one short sentence in your message saying why. " +
  "Once you have what you need, give a short, friendly final answer in plain text (no markdown tables)."

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

function stepCard(name: string, args: string) {
  const details = el("details", "step")
  details.dataset.state = "running"
  const summary = el("summary")
  let shortArgs = args
  try {
    shortArgs = Object.values(JSON.parse(args || "{}")).join(", ")
  } catch {
    // Show the raw arguments if they aren't valid JSON
  }
  const state = el("span", "step-state", "running…")
  summary.append(el("span", "step-badge", "tool"), el("span", "step-name", name), el("span", "step-args", shortArgs), state)
  const pre = el("pre")
  details.append(summary, pre)
  add(details)
  return (ok: boolean, result: string) => {
    details.dataset.state = ok ? "done" : "error"
    state.textContent = ok ? "done" : "failed"
    try {
      pre.textContent = JSON.stringify(JSON.parse(result), null, 2)
    } catch {
      pre.textContent = result
    }
  }
}

// Drop the oldest whole turns (from one user message to the next) to bound the prompt
function trimHistory() {
  while (history.length > MAX_HISTORY) {
    const nextUser = history.findIndex((m, i) => i > 0 && m.role === "user")
    history.splice(0, nextUser > 0 ? nextUser : history.length)
  }
}

async function runAgent(question: string) {
  history.push({ role: "user", content: question })
  trimHistory()

  for (let step = 0; step < MAX_STEPS; step++) {
    const typing = add(el("div", "typing", step === 0 ? "Thinking" : "Reading the results"))
    let reply
    try {
      reply = await chat({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        tools: TOOL_DEFS,
        temperature: 0.3,
        max_tokens: 800,
      })
    } finally {
      typing.remove()
    }

    const { content, tool_calls } = reply.message
    if (tool_calls?.length) {
      history.push({ role: "assistant", content: content ?? null, tool_calls })
      if (content?.trim()) add(el("div", "thought", content.trim()))
      for (const call of tool_calls) {
        const finish = stepCard(call.function.name, call.function.arguments)
        const { ok, result } = await runTool(call.function.name, call.function.arguments)
        finish(ok, result)
        history.push({ role: "tool", tool_call_id: call.id, content: result })
      }
      continue
    }

    const answer = plainText(content ?? "") || "(The model returned an empty answer.)"
    history.push({ role: "assistant", content: answer })
    const bubble = add(el("div", "msg msg-bot", answer))
    bubble.append(el("div", "msg-meta", `${step} tool step${step === 1 ? "" : "s"} · ${reply.model}`))
    return
  }
  add(el("div", "msg msg-error", `Stopped after ${MAX_STEPS} steps without a final answer. Try rephrasing.`))
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
    await runAgent(question)
  } catch (err) {
    // Remove the unanswered turn so the history stays valid for the next try
    const lastUser = history.map((m) => m.role).lastIndexOf("user")
    if (lastUser >= 0) history.splice(lastUser)
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

add(el("div", "msg msg-bot", "Hi! I can check the weather, look things up on Wikipedia, tell the time anywhere, and do math or unit conversions. What would you like to know?"))
void initAccess($("account"), (message) => add(el("div", "msg msg-error", message)))
