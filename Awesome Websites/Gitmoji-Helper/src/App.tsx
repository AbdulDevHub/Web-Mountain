import { useEffect, useMemo, useState } from "react";
import { preloadEmbedder } from "./lib/embeddings";
import { rankGitmojis, type RankedMatch } from "./lib/rank";
import "./App.css";

type ModelState = "loading" | "ready" | "error";

export default function App() {
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [loadPct, setLoadPct] = useState(0);
  const [input, setInput] = useState("");
  const [matches, setMatches] = useState<RankedMatch[]>([]);
  const [selected, setSelected] = useState<RankedMatch | null>(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    preloadEmbedder(setLoadPct)
      .then(() => setModelState("ready"))
      .catch((err) => {
        console.error(err);
        setModelState("error");
      });
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || modelState !== "ready") return;
    setSearching(true);
    setSelected(null);
    try {
      const results = await rankGitmojis(input, 3);
      setMatches(results);
    } finally {
      setSearching(false);
    }
  }

  const commitMessage = useMemo(() => {
    if (!selected) return "";
    return `${selected.emoji} ${selected.type}: ${input.trim()}`;
  }, [selected, input]);

  async function handleCopy() {
    if (!commitMessage) return;
    await navigator.clipboard.writeText(commitMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="app">
      <header>
        <h1>Gitmoji Commit Helper</h1>
        <p className="subtitle">
          Describe your change. Matching runs fully in your browser — nothing is sent to a server.
        </p>
      </header>

      {modelState === "loading" && (
        <div className="model-status">Loading embedding model… {loadPct}%</div>
      )}
      {modelState === "error" && (
        <div className="model-status error">
          Couldn't load the embedding model. Check your connection and reload.
        </div>
      )}

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="e.g. fix scrolling behaviour"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={modelState !== "ready"}
        />
        <button type="submit" disabled={modelState !== "ready" || searching || !input.trim()}>
          {searching ? "Matching…" : "Match"}
        </button>
      </form>

      {matches.length > 0 && (
        <ul className="results">
          {matches.map((m, i) => (
            <li key={`${m.emoji}-${i}`}>
              <button
                className={`result-card ${selected === m ? "selected" : ""}`}
                onClick={() => setSelected(m)}
              >
                <span className="emoji">{m.emoji}</span>
                <span className="type">{m.type}</span>
                <span className="desc">{m.description}</span>
                <span className="score">{Math.round(m.score * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="output">
          <code>{commitMessage}</code>
          <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}
    </div>
  );
}
