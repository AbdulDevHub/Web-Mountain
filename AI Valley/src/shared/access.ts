// UI pieces for the shared AI access flow: the account chip in the top bar and the
// "Sign in with OpenRouter" notice shown when the free proxy can't serve a request.

import { completeSignIn, getUserKey, signOut, startSignIn, type SignInReason } from "./ai-client"

const MESSAGES: Record<SignInReason, string> = {
  quota:
    "Today's shared free AI quota is used up. Sign in with OpenRouter to keep going on your own account (its free models cost nothing).",
  "not-configured":
    "The shared AI proxy isn't available right now. Sign in with OpenRouter to use your own account (its free models cost nothing).",
  "key-rejected": "OpenRouter rejected your saved key. Please sign in again.",
}

let accountSlot: HTMLElement | null = null

function renderAccountChip(slot: HTMLElement) {
  accountSlot = slot
  slot.replaceChildren()
  if (!getUserKey()) return

  const chip = document.createElement("span")
  chip.className = "account-chip"
  chip.textContent = "Using your OpenRouter account ·"

  const out = document.createElement("button")
  out.className = "link-btn"
  out.type = "button"
  out.textContent = "Sign out"
  out.addEventListener("click", () => {
    signOut()
    renderAccountChip(slot)
  })

  chip.append(" ", out)
  slot.append(chip)
}

/** Finishes a pending OAuth redirect and fills the account slot. Call once on load. */
export async function initAccess(slot: HTMLElement, onError: (message: string) => void) {
  try {
    await completeSignIn()
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err))
  }
  renderAccountChip(slot)
}

/** Shows the sign-in notice inside `container`, replacing any previous one. */
export function showSignInNotice(container: HTMLElement, reason: SignInReason) {
  hideSignInNotice(container)
  if (accountSlot) renderAccountChip(accountSlot) // a rejected key was just cleared

  const notice = document.createElement("div")
  notice.className = "access-notice"
  notice.setAttribute("role", "status")

  const text = document.createElement("p")
  text.textContent = MESSAGES[reason]

  const button = document.createElement("button")
  button.className = "btn btn-primary"
  button.type = "button"
  button.textContent = "Sign in with OpenRouter"
  button.addEventListener("click", () => {
    button.disabled = true
    void startSignIn()
  })

  notice.append(text, button)
  container.append(notice)
}

export function hideSignInNotice(container: HTMLElement) {
  container.querySelector(".access-notice")?.remove()
}
