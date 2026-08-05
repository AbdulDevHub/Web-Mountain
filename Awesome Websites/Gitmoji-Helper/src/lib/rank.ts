import { cosineSimilarity, embedText } from "./embeddings";
import gitmojiEmbeddings from "../data/gitmojiEmbeddings.json";

export interface RankedMatch {
  emoji: string;
  type: string;
  description: string;
  score: number; // raw cosine + boost, used for ranking — don't display raw
  confidence: number; // 0..1, rescaled against this query's own score spread, for display
}

interface EmbeddedEntry {
  emoji: string;
  type: string;
  description: string;
  embedding: number[];
}

const DATA = gitmojiEmbeddings as EmbeddedEntry[];

// Small keyword boosts layered on top of the semantic score. Keys are matched
// as whole words (case-insensitive) against the user's input.
const KEYWORD_BOOSTS: { pattern: RegExp; emojiTypes: string[]; boost: number }[] = [
  { pattern: /\b(remove|delete|drop)\b/i, emojiTypes: ["🔥", "⚰️"], boost: 0.08 },
  { pattern: /\b(rename|move)\b/i, emojiTypes: ["🚚"], boost: 0.08 },
  { pattern: /\b(docs?|readme|comment)\b/i, emojiTypes: ["📝", "💡"], boost: 0.08 },
  { pattern: /\b(dependency|dependencies|package)\b/i, emojiTypes: ["➕", "➖", "⬆️", "⬇️", "📌"], boost: 0.06 },
  { pattern: /\b(config|eslint|prettier|tsconfig)\b/i, emojiTypes: ["🔧"], boost: 0.08 },
  { pattern: /\btest(s|ing)?\b/i, emojiTypes: ["✅", "🧪", "🤡"], boost: 0.06 },
  { pattern: /\btypo\b/i, emojiTypes: ["✏️"], boost: 0.1 },
  { pattern: /\bsecurity|vulnerab/i, emojiTypes: ["🔒️"], boost: 0.08 },
  { pattern: /\b(dev|developer)\b.*\bsetup\b|\bsetup\b.*\b(dev|developer)\b|\bonboarding\b/i, emojiTypes: ["🧑‍💻"], boost: 0.1 },
  { pattern: /\bbundle size|\bshrink\b|\bsmaller bundle\b/i, emojiTypes: ["⚡️"], boost: 0.08 },
];

function keywordBoostFor(input: string, emoji: string): number {
  let boost = 0;
  for (const rule of KEYWORD_BOOSTS) {
    if (rule.pattern.test(input) && rule.emojiTypes.includes(emoji)) {
      boost += rule.boost;
    }
  }
  return boost;
}

/** Embed the user's input and return the top-N gitmoji matches, best first. */
export async function rankGitmojis(input: string, topN = 5): Promise<RankedMatch[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const queryVec = await embedText(trimmed);

  const scored = DATA.map((entry) => {
    const semantic = cosineSimilarity(queryVec, entry.embedding);
    const boost = keywordBoostFor(trimmed, entry.emoji);
    return {
      emoji: entry.emoji,
      type: entry.type,
      description: entry.description,
      score: Math.min(1, semantic + boost),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN);

  // Raw min-max rescaling always maps the #1 result to 100%, even when it's
  // only marginally ahead of everything else (e.g. a vague/meta query where
  // no candidate is a genuinely good match) — that's misleading. Instead,
  // measure how far each score stands out above the *average* of the full
  // candidate pool, in standard deviations, then squash through a sigmoid.
  // A dominant, clearly-best match => confidence near 100%.
  // A weak win where everything scored similarly => confidence near 50%.
  const allScores = scored.map((s) => s.score);
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const variance = allScores.reduce((a, b) => a + (b - mean) ** 2, 0) / allScores.length;
  const std = Math.sqrt(variance) || 1e-6;

  return top.map((m) => {
    const z = (m.score - mean) / std;
    const confidence = 1 / (1 + Math.exp(-z)); // sigmoid
    return { ...m, confidence };
  });
}
