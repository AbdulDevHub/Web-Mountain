import "../shared/theme.css"
import "./style.css"
import { chat, SignInRequired } from "../shared/ai-client"
import { hideSignInNotice, initAccess, showSignInNotice } from "../shared/access"
import { $, el, errorMessage } from "../shared/dom"

const MAX_TICKERS = 3
const SVG_NS = "http://www.w3.org/2000/svg"

interface Series {
  ticker: string
  closes: { date: string; close: number }[]
}

const addForm = $<HTMLFormElement>("add-form")
const tickerInput = $<HTMLInputElement>("ticker")
const tickerList = $<HTMLDivElement>("tickers")
const hint = $<HTMLParagraphElement>("hint")
const reportBtn = $<HTMLButtonElement>("report-btn")
const charts = $<HTMLDivElement>("charts")
const report = $<HTMLElement>("report")
const noticeSlot = $<HTMLDivElement>("notice-slot")

const tickers: string[] = []

function renderTickers() {
  tickerList.replaceChildren(
    ...tickers.map((t) => {
      const chip = el("span", "ticker-chip", t)
      const remove = el("button", "", "×")
      remove.type = "button"
      remove.setAttribute("aria-label", `Remove ${t}`)
      remove.addEventListener("click", () => {
        tickers.splice(tickers.indexOf(t), 1)
        renderTickers()
      })
      chip.append(remove)
      return chip
    }),
  )
  reportBtn.disabled = tickers.length === 0
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const t = tickerInput.value.trim().toUpperCase()
  if (!/^[A-Z][A-Z.]{0,5}$/.test(t)) {
    hint.textContent = "Tickers are 1-6 letters, like AAPL or BRK.B."
    return
  }
  if (tickers.includes(t)) return
  if (tickers.length >= MAX_TICKERS) {
    hint.textContent = `Up to ${MAX_TICKERS} tickers at a time.`
    return
  }
  tickers.push(t)
  tickerInput.value = ""
  hint.textContent = "Add more, or generate the report."
  renderTickers()
})

// ---------- Data ----------

async function fetchSeries(ticker: string): Promise<Series> {
  const res = await fetch(`/api/stock-prices?ticker=${encodeURIComponent(ticker)}`)
  const data = await res.json().catch(() => null)
  // 503 = no Polygon key; a non-JSON 404/405/501 = no function at all (plain static host)
  if (res.status === 503 || (!data && [404, 405, 501].includes(res.status))) {
    throw new Error("Stock data isn't set up on this site yet (it needs a free Polygon.io key).")
  }
  if (!res.ok) throw new Error(data?.error ?? `Couldn't load ${ticker} (${res.status})`)
  return data as Series
}

// ---------- Sparklines ----------

function sparkline(series: Series): HTMLElement {
  const values = series.closes.map((c) => c.close)
  const first = values[0]
  const last = values.at(-1)!
  const change = ((last - first) / first) * 100
  const min = Math.min(...values)
  const max = Math.max(...values)
  const w = 200
  const h = 56
  const points = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w
      const y = max === min ? h / 2 : h - 4 - ((v - min) / (max - min)) * (h - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
  svg.setAttribute("preserveAspectRatio", "none")
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", `${series.ticker} closing prices, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}%`)
  const line = document.createElementNS(SVG_NS, "polyline")
  line.setAttribute("points", points)
  line.setAttribute("fill", "none")
  line.setAttribute("stroke", change >= 0 ? "var(--success)" : "var(--danger)")
  line.setAttribute("stroke-width", "2")
  line.setAttribute("vector-effect", "non-scaling-stroke")
  svg.append(line)

  const card = el("div", "chart")
  const head = el("div", "chart-head")
  const pct = el("span", "chart-change", `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`)
  pct.dataset.dir = change >= 0 ? "up" : "down"
  head.append(el("strong", "", series.ticker), pct)
  const foot = el(
    "div",
    "chart-foot",
    `${series.closes[0].date} → ${series.closes.at(-1)!.date} · last close $${last.toFixed(2)}`,
  )
  card.append(head, svg, foot)
  return card
}

// ---------- Report ----------

const SYSTEM_PROMPT = `You are a witty trading guru. Given daily closing prices, write a report of no more than 150 words on each stock's performance and say whether to buy, hold or sell. Plain text, no markdown. Match the style of these examples:

###
OK baby, hold on tight! You are going to love this! Over the past week, TSLA climbed from $202 to $227. That's a mighty 12% jump, and the momentum is still going strong. My advice? Buy now before everyone else catches on!
###
Ouch. MSFT drifted down from $310 to $299 this week. Not a disaster, but the bears are sniffing around. Hold tight and keep an eye on it before you do anything rash.
###`

async function generate() {
  reportBtn.disabled = true
  hideSignInNotice(noticeSlot)
  charts.replaceChildren()
  report.dataset.error = "false"
  report.textContent = "Fetching prices…"
  try {
    const series = await Promise.all(tickers.map(fetchSeries))
    charts.replaceChildren(...series.map(sparkline))
    report.textContent = "Writing the report…"
    const data = series
      .map((s) => `${s.ticker}: ${s.closes.map((c) => `${c.date} $${c.close.toFixed(2)}`).join(", ")}`)
      .join("\n")
    const { message } = await chat({
      temperature: 0.9,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: data },
      ],
    })
    report.textContent = `${message.content?.trim() || "The analyst is speechless. Try again."}\n\nFor fun only, not financial advice.`
  } catch (err) {
    if (err instanceof SignInRequired) {
      report.textContent = ""
      showSignInNotice(noticeSlot, err.reason)
    } else {
      report.dataset.error = "true"
      report.textContent = errorMessage(err)
    }
  } finally {
    reportBtn.disabled = tickers.length === 0
  }
}

reportBtn.addEventListener("click", generate)
void initAccess($("account"), (message) => {
  report.dataset.error = "true"
  report.textContent = message
})
