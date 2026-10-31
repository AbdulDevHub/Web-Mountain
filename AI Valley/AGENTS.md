# AI Valley

AI web apps inside Web-Mountain, deployed on Netlify (modern-web-mountain.netlify.app).

Verify: npm run build

## Layout
- `src/<app>/index.html` + `main.ts` + `style.css`: one page per app. Vite picks up every `src/*/index.html` automatically.
- `src/shared/`: `theme.css` (dark base; each app sets `--accent`), `ai-client.ts` (LLM calls, OpenRouter OAuth PKCE), `access.ts` (sign-in notice + account chip), `chrome-ai.d.ts`.
- `../netlify/functions/*.mts`: serverless functions at `/api/<name>`. `vite.config.ts` serves them in dev too.
- `apps/`: build output (gitignored, built on Netlify by the root `build.sh`). Showcase links point at `AI Valley/apps/<app>/index.html`.
- The other folders are course originals waiting to be rebuilt. Remove each one once its replacement ships, and list it under "Course originals" in README.md.

## Rules
- Never put API keys in client code. LLM calls go through `chat()` in `src/shared/ai-client.ts`, which uses the proxy or the visitor's own OpenRouter key.
- Free models only (`FREE_MODELS` in `ai-client.ts` and `DEFAULT_MODELS` in `ai-chat.mts`; keep the two in sync).
- Prefer on-device/in-browser AI when it fits. Always handle `SignInRequired` by calling `showSignInNotice`.
- Wrap browser storage in try/catch. Pages must work at 390px with no horizontal scroll.

## Rebuild plan (decided 2026-10-31)
Done: Lingua (translator). Next: ReAct Agent → ReelRecs (in-browser embeddings over `Reel Recs (Open AI Assistant API)/movies.txt`) → Vision Lab → stock app (Polygon via a Netlify function) → Image Studio (Pollinations Flux via a Netlify function).
