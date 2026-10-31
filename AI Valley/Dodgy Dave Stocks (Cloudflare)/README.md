# Dodgy Dave Stocks (Cloudflare)

Stock prediction app that pulls recent prices from Polygon and asks GPT for a tongue-in-cheek report. API keys sit behind a Cloudflare Worker so they never reach the browser.

- **Stack:** OpenAI Chat API, Polygon.io, Cloudflare Workers, Vite
- **Status:** Broken. It calls the course's Cloudflare Workers, and the OpenAI one now returns 500. Will be merged with AI Stock App onto AI Valley's own proxy.

> Started from Scrimba's AI Engineer path, then kept as a learning project.
