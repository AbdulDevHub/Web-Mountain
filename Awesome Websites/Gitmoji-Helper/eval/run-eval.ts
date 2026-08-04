/**
 * Run with: npm run eval
 *
 * Runs every case in eval/cases.ts through the exact same rankGitmojis()
 * function the app uses, and reports top-1 / top-3 accuracy plus a list of
 * misses so you can see exactly what to fix (an alias, a keyword boost, or
 * a case that's genuinely ambiguous).
 *
 * Requires src/data/gitmojiEmbeddings.json to already exist — run
 * `npm run precompute` first.
 */
import { rankGitmojis } from "../src/lib/rank";
import { EVAL_CASES } from "./cases";

async function main() {
  let top1 = 0;
  let top3 = 0;
  const misses: { input: string; expected: string; got: string[] }[] = [];

  for (const { input, expected } of EVAL_CASES) {
    const results = await rankGitmojis(input, 3);
    const emojis = results.map((r) => r.emoji);

    if (emojis[0] === expected) top1++;
    if (emojis.includes(expected)) top3++;
    else misses.push({ input, expected, got: emojis });
  }

  const n = EVAL_CASES.length;
  console.log(`\nTop-1 accuracy: ${top1}/${n} (${((top1 / n) * 100).toFixed(1)}%)`);
  console.log(`Top-3 accuracy: ${top3}/${n} (${((top3 / n) * 100).toFixed(1)}%)\n`);

  if (misses.length) {
    console.log(`Missed cases (expected emoji not in top 3):`);
    for (const m of misses) {
      console.log(`  "${m.input}" — expected ${m.expected}, got [${m.got.join(", ")}]`);
    }
  } else {
    console.log("No misses! 🎉");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
