import { useEffect, useMemo, useState } from "react";
import { preloadEmbedder } from "./lib/embeddings";
import { rankGitmojis, type RankedMatch } from "./lib/rank";
import "./App.css";

type ModelState = "loading" | "ready" | "error";

export default function App() {
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [loadPct, setLoadPct] = useState(0);
  const [input, setInput] = useState("");
  const [showScope, setShowScope] = useState(false);
  const [scope, setScope] = useState("");
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
      const results = await rankGitmojis(input, 5);
      setMatches(results);
    } finally {
      setSearching(false);
    }
  }

  const commitMessage = useMemo(() => {
    if (!selected) return "";
    const trimmedScope = showScope ? scope.trim() : "";
    const typeAndScope = trimmedScope ? `${selected.type}(${trimmedScope})` : selected.type;
    return `${selected.emoji} ${typeAndScope}: ${input.trim()}`;
  }, [selected, input, scope, showScope]);

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

      <label className="scope-toggle">
        <input
          type="checkbox"
          checked={showScope}
          onChange={(e) => setShowScope(e.target.checked)}
        />
        Add scope
      </label>

      {showScope && (
        <input
          type="text"
          className="scope-field"
          placeholder="scope — e.g. CarerFlow"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          disabled={modelState !== "ready"}
        />
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

      {matches.length > 0 && matches[0].confidence < 0.75 && (
        <p className="low-confidence-hint">
          None of these stood out strongly — try describing the actual code
          change rather than the task in general terms.
        </p>
      )}

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
                <span className="score">{Math.round(m.confidence * 100)}%</span>
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