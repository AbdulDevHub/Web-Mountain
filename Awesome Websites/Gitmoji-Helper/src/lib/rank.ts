import { cosineSimilarity, embedText } from "./embeddings";
import gitmojiEmbeddings from "../data/gitmojiEmbeddings.json";

export interface RankedMatch {
  emoji: string;
  type: string;
  description: string;
  score: number; // 0..1, roughly a confidence
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
  return scored.slice(0, topN);
}
