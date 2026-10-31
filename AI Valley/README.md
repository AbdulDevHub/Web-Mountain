# AI Valley

<img src="./Screenshot.jpg" alt="AI Valley projects" width="1000">

AI web apps covering LLM chat, retrieval-augmented generation, agents, image generation, and in-browser computer vision. Most started from Scrimba's AI Engineer path and are being reworked so anyone can try them on the live site without an API key.

This folder used to be the standalone `AI-Mountain` repo. Its full commit history (from January 2024) was merged in here.

## Try it now (no key needed)

| Project | What it does | Stack |
| --- | --- | --- |
| [Face-Detection](./Face-Detection) | Real-time face, landmark and emotion detection from your webcam | face-api.js (TensorFlow.js) |
| [Vision AI App](./Vision%20AI%20App) | Object detection on an image, running fully in the browser | Transformers.js (`Xenova/yolos-tiny`) |

## Being upgraded

These currently call OpenAI, Hugging Face or Supabase straight from the browser and need keys you don't have. The plan:

- Models small enough to run in the browser (translation, speech, colorizing) move to Transformers.js.
- LLM apps go through a free shared proxy, falling back to "Sign in with OpenRouter" once the daily cap is hit.

| Project | What it does | Stack | Needs |
| --- | --- | --- | --- |
| [AI Stock App](./AI%20Stock%20App) | GPT-written stock trend report from recent prices | OpenAI, Polygon.io | OpenAI + Polygon keys |
| [Dodgy Dave Stocks (Cloudflare)](./Dodgy%20Dave%20Stocks%20(Cloudflare)) | Same app with keys hidden behind Cloudflare Workers | OpenAI, Cloudflare Workers | Broken (course Workers offline) |
| [AI Translator](./AI%20Translator) | Translates text into French, Spanish or Japanese | OpenAI | OpenAI key |
| [Colorize Image AI App](./Colorize%20Image%20AI%20App) | Colorizes black-and-white photos | Hugging Face Inference | HF token |
| [Text To Speech](./Text%20To%20Speech) | Turns text into speech | Hugging Face Inference | HF token |
| [ReAct AI Agent With Chat UI](./ReAct%20AI%20Agent%20With%20Chat%20UI) | Agent that picks and calls tools (location, weather) on its own | OpenAI function calling | OpenAI key |
| [Movie Focus Chatbot](./Movie%20Focus%20Chatbot) | Movie Q&A over a vector store | OpenAI embeddings, Supabase | OpenAI + Supabase |
| [ReelRecs](./ReelRecs) | Movie recommendations with embeddings | OpenAI embeddings, Supabase | OpenAI + Supabase |
| [Reel Recs (Assistants API)](./Reel%20Recs%20(Open%20AI%20Assistant%20API)) | Movie recommendations from a file with file search | OpenAI Assistants API | OpenAI key |
| [Scrimba Chatbot](./Scrimba%20Chatbot) | RAG chatbot with conversation memory | LangChain, Supabase | OpenAI + Supabase |
| [AI Art Generator](./AI%20Art%20Generator) | Generates art from a prompt | DALL·E | OpenAI key |
| [Film Fusion](./Film%20Fusion) | Movie poster from a title and art style | DALL·E 3 | OpenAI key |
| [DALL·E Image Editor](./Dalle%20Image%20Editor) | Repaints a masked area of an image | DALL·E edits | OpenAI key |
| [Image Variations](./Image%20Variations) | Variations of an uploaded image | DALL·E variations | OpenAI key |
| [Vision AI](./Vision%20AI) | Compares two images with GPT-4 Vision | OpenAI vision | OpenAI key |

## Run locally

The two keyless apps are plain static pages. Serve the folder and open them:

```bash
npx serve "AI Valley/Face-Detection"
```

The key-based apps read `process.env.*`, which the Scrimba environment used to fill in, so they won't run locally as-is. They'll be rewired to the shared proxy as they're upgraded.
