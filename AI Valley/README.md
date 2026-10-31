# AI Valley

Seven AI web apps you can try for free on the [live site](https://modern-web-mountain.netlify.app/) (pick the **AI Valley** filter). No API key or account needed. Anything small enough runs on your device; the rest uses free open-weight models through a small serverless proxy.

This folder used to be the standalone `AI-Mountain` repo: 18 projects that started from Scrimba's AI Engineer path. Its full commit history (from January 2024) was merged in here, and the projects were rebuilt and combined into the apps below.

## Apps

| App | What it does | Built with |
| --- | --- | --- |
| [Lingua](./src/translator) | Translates between 20 languages and reads results aloud | Chrome's on-device Translator + Language Detector APIs, cloud fallback, Web Speech API |
| [ReAct Agent](./src/agent) | Agent that reasons, picks tools and shows each step | OpenRouter function calling; tools: Open-Meteo weather, Wikipedia, `Intl` time zones, a hand-written expression parser, unit conversion |
| [ReelRecs](./src/movies) | Movie chatbot grounded in its own film list | RAG: `all-MiniLM-L6-v2` embeddings in the browser (Transformers.js), cosine search, standalone-question rewriting for follow-ups |
| [Vision Lab](./src/vision) | Detects objects in a photo or webcam frame, then answers questions about it | `yolos-tiny` on Transformers.js (WebGPU/WASM), free multimodal LLM |
| [Market Pulse](./src/stocks) | AI-written report on up to 3 stock tickers, with sparklines | Netlify function → Polygon.io (key on the server), few-shot prompt, hand-drawn SVG charts |
| [Image Studio](./src/images) | Text-to-image, movie posters, and photo remix/colorize | Pollinations Flux via a Netlify function; remix = vision LLM description → repaint |
| [Face Emotion Detection](./Face-Detection) | Real-time face, landmark and emotion detection from your webcam | face-api.js (TensorFlow.js) |

## How free AI access works

- **In-browser first.** Translation (Chrome), embeddings, object detection and face detection run on the visitor's device.
- **Free shared proxy.** LLM calls go to [`netlify/functions/ai-chat.mts`](../netlify/functions/ai-chat.mts), which forwards them to OpenRouter's free models with the site's key. The key never reaches the browser. The model list is fixed on the server, inputs are validated and size-capped, slow or failed models are retried once, and Netlify rate-limits each IP.
- **Sign in with OpenRouter.** When the shared daily quota runs out, apps offer OpenRouter's OAuth (PKCE) sign-in, and calls then run on the visitor's own account (still free models). The key is kept in that browser's `localStorage` until "Sign out". See [`src/shared/ai-client.ts`](./src/shared/ai-client.ts).
- **Other keys stay server-side too:** Polygon.io (`stock-prices.mts`) and the optional Pollinations token (`image-gen.mts`).

## Course originals

The 18 original course projects were combined into the apps above. Everything stays in git history:

- [Snapshot of all 18 originals](https://github.com/AbdulDevHub/Web-Mountain/tree/72f5b9ef51b1b83fd1eaa8ef20a93f51cdc9c879/AI%20Valley), taken right after the merge

| App | Replaced |
| --- | --- |
| Lingua | AI Translator ("PollyGlot" solo project), Text To Speech |
| ReAct Agent | ReAct AI Agent With Chat UI |
| ReelRecs | Movie Focus Chatbot, ReelRecs, Reel Recs (Assistants API), Scrimba Chatbot |
| Vision Lab | Vision AI App, Vision AI |
| Market Pulse | AI Stock App, Dodgy Dave Stocks (Cloudflare) |
| Image Studio | AI Art Generator, Film Fusion, DALL·E Image Editor, Image Variations, Colorize Image AI App |

## Run locally

The apps are one multi-page Vite + TypeScript project:

```bash
cd "AI Valley"
npm install
npm run dev        # http://localhost:5173/translator/ (also /agent/, /movies/, /vision/, /stocks/, /images/)
npm run build      # type-check + build into apps/
```

`npm run dev` also serves the Netlify functions at `/api/*`. Put any keys you have in `AI Valley/.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...   # free: https://openrouter.ai/keys
POLYGON_API_KEY=...               # free: https://polygon.io (Market Pulse)
POLLINATIONS_TOKEN=...            # optional: https://auth.pollinations.ai (Image Studio)
```

Without them, LLM features fall back to "Sign in with OpenRouter" (works on localhost too), Market Pulse says stock data isn't set up, and Image Studio uses Pollinations' anonymous tier.
