// Daily closing prices for Market Pulse, fetched from Polygon.io with the site's
// free key (POLYGON_API_KEY env var) so it never reaches the browser.
// GET /api/stock-prices?ticker=AAPL -> { ticker, closes: [{ date, close }] }

const LOOKBACK_DAYS = 10 // calendar days, enough for ~5 trading days
const TICKER = /^[A-Z][A-Z.]{0,5}$/

// Only successful price lookups are cached; errors must not outlive their cause
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": status === 200 ? "public, max-age=900" : "no-store",
    },
  })

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export default async (req: Request) => {
  if (req.method !== "GET") return json(405, { error: "Use GET" })

  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) return json(503, { error: "stock_data_not_configured" })

  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase() ?? ""
  if (!TICKER.test(ticker)) return json(400, { error: "Use a ticker like AAPL or BRK.B" })

  const to = new Date()
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86_400_000)
  const url =
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${isoDate(from)}/${isoDate(to)}` +
    `?adjusted=true&sort=asc&apiKey=${apiKey}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    return json(502, { error: "The stock data service didn't respond. Try again." })
  }
  if (res.status === 429) return json(429, { error: "Stock data rate limit hit (free tier: 5 per minute). Wait a minute." })
  if (!res.ok) return json(502, { error: `Stock data request failed (${res.status})` })

  let data: { results?: { t: number; c: number }[] }
  try {
    data = await res.json()
  } catch {
    return json(502, { error: "The stock data service sent an unreadable reply. Try again." })
  }
  const closes = (data.results ?? []).map((r) => ({ date: isoDate(new Date(r.t)), close: r.c }))
  if (closes.length === 0) return json(404, { error: `No recent prices found for ${ticker}` })
  return json(200, { ticker, closes })
}

export const config = {
  path: "/api/stock-prices",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["ip", "domain"],
    windowSize: 60,
    windowLimit: 10,
  },
}
