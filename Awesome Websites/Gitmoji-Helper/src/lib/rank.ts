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
export async function rankGitmojis(input: string, topN = 3): Promise<RankedMatch[]> {
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

  // Raw cosine similarity from MiniLM clusters tightly (often 0.3-0.6 even
  // for a clearly-best match), which reads as a misleadingly low percentage.
  // Rescale relative to the score spread across *all* candidates for this
  // specific query, purely for display — ranking above already used the raw score.
  const allScores = scored.map((s) => s.score);
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);
  const range = max - min || 1;

  return top.map((m) => ({
    ...m,
    confidence: Math.max(0, Math.min(1, (m.score - min) / range)),
  }));
}
