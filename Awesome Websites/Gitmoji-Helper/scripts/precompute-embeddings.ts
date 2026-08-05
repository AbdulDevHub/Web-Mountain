/**
 * Run this locally with:  npm run precompute
 *
 * Downloads the embedding model (first run only, ~30MB quantized) and
 * computes an embedding for every entry in src/data/gitmojis.ts, then
 * writes the result to src/data/gitmojiEmbeddings.json.
 *
 * IMPORTANT: this MUST use the exact same model id as src/lib/embeddings.ts
 * (the runtime/browser embedder), or cosine similarity will be meaningless.
 */
import { pipeline } from "@huggingface/transformers";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { GITMOJIS } from "../src/data/gitmojis";
import { EMBEDDING_MODEL } from "../src/lib/embeddingModel";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log(`Loading model: ${EMBEDDING_MODEL} ...`);
  const embedder = await pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "q8",
  });

  console.log(`Embedding ${GITMOJIS.length} gitmoji entries...`);
  const results: { emoji: string; type: string; description: string; embedding: number[] }[] = [];

  for (const entry of GITMOJIS) {
    const output = await embedder(entry.text, { pooling: "mean", normalize: true });
    results.push({
      emoji: entry.emoji,
      type: entry.type,
      description: entry.description,
      embedding: Array.from(output.data as Float32Array),
    });
    process.stdout.write(".");
  }
  console.log("\nDone embedding.");

  const outPath = path.join(__dirname, "../src/data/gitmojiEmbeddings.json");
  writeFileSync(outPath, JSON.stringify(results));
  console.log(`Wrote ${results.length} embeddings to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
