// Single source of truth for the embedding model id.
// Both scripts/precompute-embeddings.ts (Node, build-time) and
// src/lib/embeddings.ts (browser, runtime) must import this same constant —
// cosine similarity is only valid when both sides use the identical model.
//
// After changing this, you MUST re-run `npm run precompute` (regenerates
// gitmojiEmbeddings.json) and clear the browser's site data / use a private
// window once, so it doesn't try to reuse a previous model's cached files.
//
// Options tried/considered so far:
//
// - Xenova/all-MiniLM-L6-v2    384-dim, ~23MB quantized. Fastest, smallest.
//                              Baseline model. Eval: 73.8% top-1 / 85.2% top-3.
//
// - Xenova/all-MiniLM-L12-v2   384-dim, ~35MB quantized. Deeper version of L6.
//                              Eval: 70.5% top-1 / 90.2% top-3 (current pick —
//                              better top-3, which is what the UI shows).
//
// - Xenova/gte-small           384-dim, ~35MB quantized. Often outperforms the
//                              MiniLM family at a similar size. No special
//                              query prefix needed. Worth trying next.
//
// - Xenova/all-mpnet-base-v2   768-dim, ~110MB quantized. Meaningfully higher
//                              quality than the MiniLM family, but bigger
//                              download and slower per-query.
//
// - Xenova/bge-small-en-v1.5   384-dim, ~35MB quantized. Strong, but wants
//                              queries prefixed with "Represent this sentence
//                              for searching relevant passages: " for best
//                              results — skip unless you want to add that.
//
// Re-run `npm run eval` after switching and log the new numbers here so this
// list stays useful as a comparison log, not just a menu.
export const EMBEDDING_MODEL = "Xenova/gte-small";