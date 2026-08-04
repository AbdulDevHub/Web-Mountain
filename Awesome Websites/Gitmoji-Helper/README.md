# Gitmoji Commit Helper

Type a plain-English commit description (e.g. `fix scrolling behaviour`) and
get the top 3 Gitmoji + Conventional Commit matches, ranked by semantic
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
  that runs `rankGitmojis` over them to report top-1/top-3 accuracy — makes
  it easy to tell if a ranking tweak actually helped.
