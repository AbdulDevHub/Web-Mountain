import { readdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import type { IncomingMessage } from "node:http"
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite"

const srcDir = resolve(import.meta.dirname, "src")
const functionsDir = resolve(import.meta.dirname, "../netlify/functions")

// Every folder in src/ with an index.html is its own page (shared/ holds common code)
const pages = Object.fromEntries(
  readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(srcDir, d.name, "index.html")))
    .map((d) => [d.name, resolve(srcDir, d.name, "index.html")]),
)

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value)
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

// Serves netlify/functions/<name>.mts at /api/<name> during `vite dev`, so the
// proxy can be tested locally without the Netlify CLI
function netlifyFunctions(): Plugin {
  return {
    name: "netlify-functions-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([\w-]+)/)
        const file = match && resolve(functionsDir, `${match[1]}.mts`)
        if (!file || !existsSync(file)) return next()
        try {
          const mod = await server.ssrLoadModule(file)
          const response: Response = await mod.default(await toRequest(req), {})
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make .env.local keys (e.g. OPENROUTER_API_KEY) visible to the dev functions
  Object.assign(process.env, loadEnv(mode, import.meta.dirname, ""))

  return {
    root: srcDir,
    base: "./", // Built pages live at "AI Valley/apps/<app>/" on Netlify
    envDir: import.meta.dirname,
    plugins: [netlifyFunctions()],
    build: {
      outDir: resolve(import.meta.dirname, "apps"),
      emptyOutDir: true,
      rollupOptions: { input: pages },
    },
    server: {
      fs: { allow: [import.meta.dirname, functionsDir] },
    },
  }
})
