# Gitmoji Commit Helper

Type a plain-English commit description (e.g. `fix scrolling behaviour`) and
get the top 5 Gitmoji + Conventional Commit matches, ranked by semantic
similarity — computed entirely in your browser. No API keys, no backend, no
cost.

## A note on versions

This uses `@huggingface/transformers` (v3, actively maintained) on **Vite 5**,
not the newer `@xenova/transformers` (v2, now legacy) or bleeding-edge Vite
8+. That older package bundles a webpack-UMD build of `onnxruntime-web` that
breaks under newer Vite bundlers with a
`Cannot read properties of undefined (reading 'registerBackend')` error —
if you ever `npm create vite@latest` a fresh project for this, make sure to
pin these two rather than taking whatever `@latest` gives you.

## How it works

- `src/data/gitmojis.ts` — the ~85 gitmoji entries with rich descriptions.
- `scripts/precompute-embeddings.ts` — a one-time **Node** script that loads
  the embedding model and embeds every gitmoji entry, writing the vectors to
  `src/data/gitmojiEmbeddings.json`.
- `src/lib/embeddings.ts` — loads the **same** embedding model in the
  **browser** (via Transformers.js/ONNX+WASM) to embed whatever the user
  types.
- `src/lib/rank.ts` — cosine similarity between the query vector and each
  precomputed gitmoji vector, plus a small keyword boost, sorted descending.

Both the precompute script and the browser both import the model id from
`src/lib/embeddingModel.ts` — **don't let these drift apart**, or the
similarity scores stop being comparable.

## Setup

```bash
npm install

# One-time: generate src/data/gitmojiEmbeddings.json
# (downloads the model on first run, ~30MB, cached afterwards)
npm run precompute

npm run dev
```

Open the printed local URL. The first page load will download the model
into the browser (cached after that in IndexedDB/Cache Storage — subsequent
visits are instant, and it fully works offline afterward).

## Re-running precompute

Only needed if you edit `src/data/gitmojis.ts` (add/change entries or
descriptions) or change `EMBEDDING_MODEL`. Run `npm run precompute` again
and commit the updated `gitmojiEmbeddings.json`.

## Deploying to Vercel

This is a fully static site — no environment variables, no serverless
functions, no database.

```bash
npm run build   # outputs to dist/
```

Push to GitHub and import the repo in Vercel with defaults (Vite preset).
Make sure `src/data/gitmojiEmbeddings.json` is committed (it's the
precomputed data the deployed site ships with) — don't gitignore it.

## Improving match quality

1. **Run the eval first, before changing anything**, to get a baseline:
   ```bash
   npm run eval
   ```
   This runs `eval/cases.ts` (60 realistic commit descriptions with the
   emoji you'd actually want) through the real ranking code and reports
   top-1 / top-5 accuracy plus every miss. Add more cases as you find gaps —
   write them the way you actually type, not the way `gitmojis.ts` is
   worded, or you're just testing string overlap instead of semantics.

2. **For each miss, decide which lever to pull:**
   - *The right emoji was close but not #1* → add a keyword boost rule in
     `src/lib/rank.ts` (`KEYWORD_BOOSTS`), or add the words you actually
     used to that emoji's `aliases` in `gitmojis.ts`.
   - *The right emoji wasn't even in the top 5* → its description in
     `gitmojis.ts` is probably too abstract or too close to a neighboring
     emoji's description. Make it more concrete and specific.
   - *Two emoji keep tying / swapping places* → their descriptions likely
     overlap semantically — differentiate the wording.
   - After any edit to `gitmojis.ts`, re-run `npm run precompute` before
     `npm run eval` — the eval reads the precomputed embeddings, not the
     source file.

3. **Try the bigger model** if quality plateaus with the current one:
   ```ts
   // src/lib/embeddingModel.ts
   export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L12-v2";
   ```
   Then `npm run precompute && npm run eval` to compare against baseline.
   L12 is slower and a larger download (~60MB vs ~30MB) but more accurate.
   If you change the model, clear your browser's site data for localhost
   once (or just use a private window) so it doesn't try to reuse the old
   model's cached files.

4. **Iterate**: eval → tweak → eval → compare numbers. Don't just eyeball a
   handful of manual tries — the eval script exists so you have something
   objective to compare against.

## Notes / things you may want to tune

- **Model size vs. quality**: `Xenova/all-MiniLM-L6-v2` (current choice) is
  small and fast. If match quality feels off, try
  `Xenova/all-MiniLM-L12-v2` (bigger, more accurate) — change it in
  `src/lib/embeddingModel.ts` and re-run `npm run precompute`.
- **Keyword boosts** in `src/lib/rank.ts` are a cheap way to nudge obvious
  cases (typos, dependency bumps) without retraining anything — feel free to
  extend the list based on cases where semantic-only ranking guesses wrong.
- **Bundle size warning** at build time (~1MB JS chunk) is from
  onnxruntime-web; harmless for this use case but you could lazy-load it
  behind a dynamic `import()` if you want a snappier initial paint.
- **Eval dataset** (ChatGPT's suggestion): once this is working, add
  `eval/cases.json` of `{ input, expectedEmoji }` pairs and a small script
  that runs `rankGitmojis` over them to report top-1/top-5 accuracy — makes
  it easy to tell if a ranking tweak actually helped.
