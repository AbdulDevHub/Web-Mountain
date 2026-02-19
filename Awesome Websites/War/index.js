const API = "https://apis.scrimba.com/deckofcards/api/deck"
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "JACK", "QUEEN", "KING", "ACE"]

let deckId = null
let cpuScore = 0
let youScore = 0
let isFlipping = false

// Elements
const newDeckBtn = document.getElementById("new-deck-btn")
const drawBtn = document.getElementById("draw-btn")
const playAgainBtn = document.getElementById("play-again-btn")
const remainingEl = document.getElementById("remaining-text")
const cpuScoreEl = document.getElementById("cpu-score")
const youScoreEl = document.getElementById("you-score")
const resultText = document.getElementById("result-text")
const cpuPanel = document.getElementById("cpu-panel")
const youPanel = document.getElementById("you-panel")
const cpuCardInner = document.getElementById("cpu-card-inner")
const youCardInner = document.getElementById("you-card-inner")
const cpuCardImg = document.getElementById("cpu-card-img")
const youCardImg = document.getElementById("you-card-img")
const cpuSlot = document.getElementById("cpu-slot")
const youSlot = document.getElementById("you-slot")
const overlay = document.getElementById("game-over-overlay")

function resetCards() {
  cpuCardInner.classList.remove("flipped")
  youCardInner.classList.remove("flipped")
  cpuSlot.classList.add("empty")
  youSlot.classList.add("empty")
}

function showResult(text, cls) {
  resultText.className = "result-text"
  resultText.textContent = text
  // Force reflow
  void resultText.offsetWidth
  resultText.classList.add("visible", cls)
}

function bumpScore(el) {
  el.classList.remove("bump")
  void el.offsetWidth
  el.classList.add("bump")
}

async function fetchNewDeck() {
  newDeckBtn.disabled = true
  drawBtn.disabled = true
  resetCards()
  resultText.className = "result-text"
  resultText.textContent = "Shuffling…"
  resultText.classList.add("visible")

  cpuScore = 0
  youScore = 0
  cpuScoreEl.textContent = "0"
  youScoreEl.textContent = "0"

  try {
    const res = await fetch(`${API}/new/shuffle/`)
    const data = await res.json()
    deckId = data.deck_id
    remainingEl.textContent = `${data.remaining} cards remaining`
    showResult("Draw to begin", "")
    drawBtn.disabled = false
  } catch (e) {
    showResult("Failed to load deck — try again", "cpu-win")
  }
  newDeckBtn.disabled = false
}

async function drawCards() {
  if (!deckId || isFlipping) return
  isFlipping = true
  drawBtn.disabled = true

  // Reset to back-facing
  cpuCardInner.classList.remove("flipped")
  youCardInner.classList.remove("flipped")
  cpuSlot.classList.remove("empty")
  youSlot.classList.remove("empty")
  resultText.classList.remove("visible")

  try {
    const res = await fetch(`${API}/${deckId}/draw/?count=2`)
    const data = await res.json()
    remainingEl.textContent = `${data.remaining} cards remaining`

    const [cpuCard, youCard] = data.cards

    // Set images before flip
    cpuCardImg.src = cpuCard.image
    youCardImg.src = youCard.image

    // Staggered flip
    await new Promise((r) => setTimeout(r, 120))
    cpuCardInner.classList.add("flipped")
    await new Promise((r) => setTimeout(r, 200))
    youCardInner.classList.add("flipped")

    // Wait for animations
    await new Promise((r) => setTimeout(r, 550))

    // Determine winner
    const cpuIdx = VALUES.indexOf(cpuCard.value)
    const youIdx = VALUES.indexOf(youCard.value)

    if (cpuIdx > youIdx) {
      cpuScore++
      cpuScoreEl.textContent = cpuScore
      bumpScore(cpuScoreEl)
      showResult("Dealer wins the round", "cpu-win")
      flashPanel(cpuPanel, "winner-flash")
      flashPanel(youPanel, "loser-flash")
    } else if (youIdx > cpuIdx) {
      youScore++
      youScoreEl.textContent = youScore
      bumpScore(youScoreEl)
      showResult("You win the round!", "you-win")
      flashPanel(youPanel, "winner-flash")
      flashPanel(cpuPanel, "loser-flash")
    } else {
      showResult("⚔ WAR ⚔", "war")
      cpuPanel.classList.add("war-shake")
      youPanel.classList.add("war-shake")
      setTimeout(() => {
        cpuPanel.classList.remove("war-shake")
        youPanel.classList.remove("war-shake")
      }, 900)
    }

    if (data.remaining === 0) {
      await new Promise((r) => setTimeout(r, 1200))
      showGameOver()
      return
    }

    drawBtn.disabled = false
  } catch (e) {
    showResult("Error drawing cards", "cpu-win")
    drawBtn.disabled = false
  }

  isFlipping = false
}

function flashPanel(panel, cls) {
  panel.classList.remove("winner-flash", "loser-flash")
  void panel.offsetWidth
  panel.classList.add(cls)
  panel.addEventListener("animationend", () => panel.classList.remove(cls), {
    once: true,
  })
}

function showGameOver() {
  document.getElementById("final-cpu").textContent = cpuScore
  document.getElementById("final-you").textContent = youScore

  let title, trophy
  if (youScore > cpuScore) {
    title = "You Win!"
    trophy = "🏆"
  } else if (cpuScore > youScore) {
    title = "Dealer Wins"
    trophy = "💀"
  } else {
    title = "It's a Tie!"
    trophy = "🤝"
  }
  document.getElementById("game-over-title").textContent = title
  document.getElementById("trophy-icon").textContent = trophy
  overlay.classList.add("show")
}

// Events
newDeckBtn.addEventListener("click", fetchNewDeck)
drawBtn.addEventListener("click", drawCards)
playAgainBtn.addEventListener("click", () => {
  overlay.classList.remove("show")
  fetchNewDeck()
})

// Auto-load on start
fetchNewDeck()
