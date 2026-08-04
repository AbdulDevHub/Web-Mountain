// Single source of truth for the embedding model id.
// Both scripts/precompute-embeddings.ts (Node, build-time) and
// src/lib/embeddings.ts (browser, runtime) must import this same constant —
// cosine similarity is only valid when both sides use the identical model.
//
// all-MiniLM-L6-v2: 384-dim sentence embeddings, small (~30MB quantized),
// good general-purpose semantic similarity, well supported by Transformers.js.
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L12-v2";
