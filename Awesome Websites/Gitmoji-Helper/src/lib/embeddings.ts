import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_MODEL } from "./embeddingModel";

// Let Transformers.js fetch models from the HF Hub CDN and cache them in the
// browser (IndexedDB / Cache Storage) so this only downloads once per device.
env.allowLocalModels = false;

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

/** Lazily create (and cache) the singleton embedding pipeline. */
function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", EMBEDDING_MODEL, {
      dtype: "q8",
    }) as Promise<FeatureExtractionPipeline>;
  }
  return embedderPromise;
}

/** Warm the model up in the background (call on app mount). */
export function preloadEmbedder(onProgress?: (pct: number) => void) {
  return pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "q8",
    progress_callback: (p: any) => {
      if (p?.status === "progress" && typeof p.progress === "number") {
        onProgress?.(Math.round(p.progress));
      }
    },
  }).then((embedder) => {
    embedderPromise = Promise.resolve(embedder as FeatureExtractionPipeline);
    return embedder;
  });
}

/** Embed a single string into a normalized vector. */
export async function embedText(text: string): Promise<Float32Array> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return output.data as Float32Array;
}

/** Cosine similarity between two equal-length vectors. Assumes both are already normalized. */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are normalized, so dot product == cosine similarity
}
