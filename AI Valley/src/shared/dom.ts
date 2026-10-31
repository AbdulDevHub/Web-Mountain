// Small DOM helpers shared by the AI Valley apps

export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

/** Creates an element with a class and text content (text is never parsed as HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

/** Free models often answer in markdown even when asked not to; render it as plain text. */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim()
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Scrolls a log container to the bottom after new content is added. */
export function scrollToEnd(container: HTMLElement) {
  container.scrollTop = container.scrollHeight
}
