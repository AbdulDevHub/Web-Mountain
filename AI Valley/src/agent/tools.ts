// Tools the ReAct agent can call. Every tool runs in the browser and uses only
// free, keyless APIs (Open-Meteo, Wikipedia) or local code.

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "get_location",
      description: "Get the user's current coordinates and time zone from the browser (asks for permission).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather. Pass either a place name or latitude + longitude.",
      parameters: {
        type: "object",
        properties: {
          place: { type: "string", description: "City or place name, e.g. 'Tokyo' or 'Paris, France'" },
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_wikipedia",
      description: "Look up a topic, person, place or event on Wikipedia and get a short summary.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time",
      description: "Get the current date and time in an IANA time zone such as 'Asia/Tokyo' or 'America/Toronto'.",
      parameters: {
        type: "object",
        properties: { timezone: { type: "string" } },
        required: ["timezone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Evaluate a math expression. Supports + - * / % ^, parentheses, sqrt, sin, cos, tan, log (base 10), ln, abs, round, pi, e.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "convert_units",
      description:
        "Convert a value between units. Length: mm, cm, m, km, in, ft, yd, mi. Mass: g, kg, oz, lb. Temperature: c, f, k. Volume: ml, l, cup, gal.",
      parameters: {
        type: "object",
        properties: {
          value: { type: "number" },
          from: { type: "string" },
          to: { type: "string" },
        },
        required: ["value", "from", "to"],
      },
    },
  },
]

type Args = Record<string, unknown>

const WEATHER_CODES: Record<number, string> = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  66: "freezing rain", 67: "heavy freezing rain", 71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
  80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers", 85: "snow showers", 86: "heavy snow showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

function getLocation(): Promise<object> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation isn't available in this browser"))
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(3)),
          longitude: Number(pos.coords.longitude.toFixed(3)),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      () => reject(new Error("The user didn't share their location. Ask them for a city instead.")),
      { timeout: 10_000, maximumAge: 600_000 },
    )
  })
}

async function getWeather({ place, latitude, longitude }: Args): Promise<object> {
  let lat = typeof latitude === "number" ? latitude : null
  let lon = typeof longitude === "number" ? longitude : null
  let name = typeof place === "string" ? place : `${lat}, ${lon}`
  if ((lat === null || lon === null) && typeof place === "string") {
    const geo = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(place.split(",")[0])}`,
    )
    const hit = geo.results?.[0]
    if (!hit) throw new Error(`Couldn't find a place called "${place}"`)
    lat = hit.latitude
    lon = hit.longitude
    name = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ")
  }
  if (lat === null || lon === null) throw new Error("Pass a place name or latitude and longitude")
  const data = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
  )
  const c = data.current
  return {
    place: name,
    conditions: WEATHER_CODES[c.weather_code] ?? `code ${c.weather_code}`,
    temperature_c: c.temperature_2m,
    feels_like_c: c.apparent_temperature,
    humidity_percent: c.relative_humidity_2m,
    wind_kmh: c.wind_speed_10m,
    local_time: c.time,
  }
}

async function searchWikipedia({ query }: Args): Promise<object> {
  const search = await getJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?limit=1&q=${encodeURIComponent(String(query))}`,
  )
  const page = search.pages?.[0]
  if (!page) throw new Error(`No Wikipedia article found for "${query}"`)
  const summary = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`)
  return {
    title: summary.title,
    summary: String(summary.extract ?? "").slice(0, 1200),
    url: summary.content_urls?.desktop?.page,
  }
}

function getTime({ timezone }: Args): object {
  const tz = String(timezone)
  const now = new Date()
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "short",
    }).format(now)
    return { timezone: tz, local_time: formatted }
  } catch {
    throw new Error(`Unknown time zone "${tz}". Use an IANA name like "Europe/Paris".`)
  }
}

// ---------- Calculator: a small recursive-descent parser (no eval) ----------

const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  log: Math.log10, ln: Math.log, abs: Math.abs, round: Math.round,
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }

export function evaluate(expression: string): number {
  const tokens = expression.toLowerCase().match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[-+*/%^()]/g) ?? []
  let i = 0
  const peek = () => tokens[i]
  const next = () => tokens[i++]

  function primary(): number {
    const t = next()
    if (t === undefined) throw new Error("Unexpected end of expression")
    if (t === "(") {
      const v = expr()
      if (next() !== ")") throw new Error("Missing closing parenthesis")
      return v
    }
    if (t === "-") return -power()
    if (t === "+") return power()
    if (/^[\d.]/.test(t)) return Number(t)
    if (t in CONSTS) return CONSTS[t]
    if (t in FUNCS) {
      if (next() !== "(") throw new Error(`Expected ( after ${t}`)
      const v = expr()
      if (next() !== ")") throw new Error("Missing closing parenthesis")
      return FUNCS[t](v)
    }
    throw new Error(`Unknown token "${t}"`)
  }
  function power(): number {
    const base = primary()
    if (peek() === "^") {
      next()
      return base ** power() // right-associative
    }
    return base
  }
  function term(): number {
    let v = power()
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = next()
      const rhs = power()
      v = op === "*" ? v * rhs : op === "/" ? v / rhs : v % rhs
    }
    return v
  }
  function expr(): number {
    let v = term()
    while (peek() === "+" || peek() === "-") {
      v = next() === "+" ? v + term() : v - term()
    }
    return v
  }

  const result = expr()
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i]}"`)
  if (!Number.isFinite(result)) throw new Error("The result isn't a finite number")
  return result
}

// ---------- Unit conversion ----------

const LINEAR_UNITS: Record<string, [kind: string, factor: number]> = {
  mm: ["length", 0.001], cm: ["length", 0.01], m: ["length", 1], km: ["length", 1000],
  in: ["length", 0.0254], ft: ["length", 0.3048], yd: ["length", 0.9144], mi: ["length", 1609.344],
  g: ["mass", 0.001], kg: ["mass", 1], oz: ["mass", 0.028349523125], lb: ["mass", 0.45359237],
  ml: ["volume", 0.001], l: ["volume", 1], cup: ["volume", 0.2365882365], gal: ["volume", 3.785411784],
}

function normalizeUnit(unit: unknown): string {
  const u = String(unit).trim().toLowerCase().replace(/^°/, "")
  const aliases: Record<string, string> = {
    celsius: "c", fahrenheit: "f", kelvin: "k", meters: "m", meter: "m", kilometers: "km", miles: "mi",
    mile: "mi", feet: "ft", foot: "ft", inches: "in", inch: "in", pounds: "lb", lbs: "lb", kilograms: "kg",
    grams: "g", ounces: "oz", liters: "l", litres: "l", gallons: "gal", cups: "cup",
  }
  return aliases[u] ?? u
}

function convertUnits({ value, from, to }: Args): object {
  const v = Number(value)
  const f = normalizeUnit(from)
  const t = normalizeUnit(to)
  const temps = ["c", "f", "k"]
  if (temps.includes(f) && temps.includes(t)) {
    const c = f === "c" ? v : f === "f" ? ((v - 32) * 5) / 9 : v - 273.15
    const out = t === "c" ? c : t === "f" ? (c * 9) / 5 + 32 : c + 273.15
    return { value: v, from: f, to: t, result: Number(out.toFixed(4)) }
  }
  const a = LINEAR_UNITS[f]
  const b = LINEAR_UNITS[t]
  if (!a || !b) throw new Error(`Unsupported unit "${!a ? from : to}"`)
  if (a[0] !== b[0]) throw new Error(`Can't convert ${a[0]} to ${b[0]}`)
  return { value: v, from: f, to: t, result: Number(((v * a[1]) / b[1]).toPrecision(8)) }
}

const IMPLEMENTATIONS: Record<string, (args: Args) => Promise<object> | object> = {
  get_location: () => getLocation(),
  get_weather: getWeather,
  search_wikipedia: searchWikipedia,
  get_time: getTime,
  calculate: ({ expression }) => ({ expression, result: evaluate(String(expression)) }),
  convert_units: convertUnits,
}

/** Runs a tool call and returns its result as a JSON string (errors included, so the model can recover). */
export async function runTool(name: string, rawArgs: string): Promise<{ ok: boolean; result: string }> {
  const impl = IMPLEMENTATIONS[name]
  if (!impl) return { ok: false, result: JSON.stringify({ error: `Unknown tool "${name}"` }) }
  try {
    const args = rawArgs ? (JSON.parse(rawArgs) as Args) : {}
    return { ok: true, result: JSON.stringify(await impl(args)) }
  } catch (err) {
    return { ok: false, result: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }
  }
}
