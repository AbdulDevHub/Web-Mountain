// Resolves public-folder assets to URLs that work under any deployment
// sub-path (e.g. Netlify serving this app from /awesome-websites/firey-passages/).
//
// Why this exists: origin-absolute paths like "/videos/brown-noise.webm" resolve
// against the site ROOT, not the app folder, so they 404 whenever the app is not
// deployed at "/". Vite rewrites `import.meta.env.BASE_URL` to a path relative to
// the built index.html, so building on it keeps local dev, `vite preview`, the
// Netlify deploy, and the Chrome extension (root-relative) all working.

const RAW_BASE = import.meta.env.BASE_URL || "/"

function normalizeBase(base) {
  return base.endsWith("/") ? base : `${base}/`
}

/**
 * Build a URL for a file that lives in `public/`.
 *
 * @param {string} path Path relative to the app root, with or without a
 *   leading slash (e.g. "videos/brown-noise.webm" or "/Favicon.png").
 * @returns {string} A base-relative URL, e.g. "./videos/brown-noise.webm".
 */
export function assetUrl(path) {
  const relative = String(path).replace(/^\/+/, "")
  return `${normalizeBase(RAW_BASE)}${relative}`
}