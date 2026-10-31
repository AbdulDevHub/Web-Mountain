# AI Valley

AI web apps inside Web-Mountain, deployed on Netlify (modern-web-mountain.netlify.app).

Verify: npm run build

## Layout
- `src/<app>/index.html` + `main.ts` + `style.css`: one page per app. Vite picks up every `src/*/index.html` automatically.
- Apps: `translator` (Lingua), `agent` (ReAct Agent), `movies` (ReelRecs), `vision` (Vision Lab), `stocks` (Market Pulse), `images` (Image Studio). `Face-Detection/` is the one original kept as plain static files.
- `src/shared/`: `theme.css` (dark base; each app sets `--accent`), `chat.css` (agent + movies), `ai-client.ts` (LLM calls, OpenRouter OAuth PKCE), `access.ts` (sign-in notice + account chip), `dom.ts`, `chrome-ai.d.ts`.
- `../netlify/functions/*.mts`: `ai-chat` (OpenRouter proxy), `stock-prices` (Polygon), `image-gen` (Pollinations), served at `/api/<name>`. `vite.config.ts` serves them in dev too.
- Netlify env vars: `OPENROUTER_API_KEY` (set), `POLYGON_API_KEY` (Market Pulse), `POLLINATIONS_TOKEN` (optional).
- `apps/`: build output (gitignored, built on Netlify by the root `build.sh`). Showcase links point at `AI Valley/apps/<app>/index.html`; card images are `src/<app>/Screenshot.png`.

## Rules
- Never put API keys in client code. LLM calls go through `chat()` in `src/shared/ai-client.ts`, which uses the proxy or the visitor's own OpenRouter key.
- Free models only (`FREE_MODELS` in `ai-client.ts` and `DEFAULT_MODELS` in `ai-chat.mts`; keep the two in sync).
- Prefer on-device/in-browser AI when it fits. Always handle `SignInRequired` by calling `showSignInNotice`.
- Wrap browser storage in try/catch. Pages must work at 390px with no horizontal scroll.

## Status (2026-10-31)
All 18 course originals are rebuilt into the 6 apps plus Face-Detection (see README "Course originals"). The user plans to audit the apps later.
