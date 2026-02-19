const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "JACK", "QUEEN", "KING", "ACE"]
const SUITS = ["SPADES", "DIAMONDS", "CLUBS", "HEARTS"]
const SYM = { SPADES: "♠", DIAMONDS: "♦", CLUBS: "♣", HEARTS: "♥" }
const COL = { SPADES: "#1c1c2e", DIAMONDS: "#8b0000", CLUBS: "#1c1c2e", HEARTS: "#8b0000" }

let deck = [],
  cpuScore = 0,
  youScore = 0,
  isFlipping = false

const get = (id) => document.getElementById(id)
const newDeckBtn = get("new-deck-btn")
const drawBtn = get("draw-btn")
const playAgainBtn = get("play-again-btn")
const remainingEl = get("remaining-text")
const cpuScoreEl = get("cpu-score")
const youScoreEl = get("you-score")
const resultText = get("result-text")
const cpuPanel = get("cpu-panel")
const youPanel = get("you-panel")
const cpuCardInner = get("cpu-card-inner")
const youCardInner = get("you-card-inner")
const cpuCardImg = get("cpu-card-img")
const youCardImg = get("you-card-img")
const overlay = get("game-over-overlay")

function buildDeck() {
  const d = []
  for (const suit of SUITS) for (const value of VALUES) d.push({ value, suit })
  return d
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function makeCardSVG({ value, suit }) {
  const lbl = { JACK: "J", QUEEN: "Q", KING: "K", ACE: "A" }[value] || value
  const sym = SYM[suit],
    col = COL[suit]
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 154">' +
    '<rect width="110" height="154" rx="8" fill="#fdfaf3" stroke="#d4c9a8" stroke-width="1.5"/>' +
    '<text x="9" y="29" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="' +
    col +
    '">' +
    lbl +
    "</text>" +
    '<text x="9" y="49" font-family="Georgia,serif" font-size="17" fill="' +
    col +
    '">' +
    sym +
    "</text>" +
    '<text x="55" y="90" font-family="Georgia,serif" font-size="46" fill="' +
    col +
    '" text-anchor="middle" dominant-baseline="middle">' +
    sym +
    "</text>" +
    '<text x="101" y="135" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="' +
    col +
    '" text-anchor="end">' +
    lbl +
    "</text>" +
    '<text x="101" y="115" font-family="Georgia,serif" font-size="17" fill="' +
    col +
    '" text-anchor="end">' +
    sym +
    "</text>" +
    "</svg>"
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
}

function showResult(text, cls) {
  resultText.className = ""
  resultText.textContent = text
  void resultText.offsetWidth
  resultText.className = "visible" + (cls ? " " + cls : "")
}

function bumpScore(el) {
  el.classList.remove("bump")
  void el.offsetWidth
  el.classList.add("bump")
}

function flashPanel(panel, cls) {
  panel.classList.remove("winner-flash", "loser-flash")
  void panel.offsetWidth
  panel.classList.add(cls)
  panel.addEventListener("animationend", () => panel.classList.remove(cls), { once: true })
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function newGame() {
  newDeckBtn.disabled = true
  drawBtn.disabled = true
  cpuCardInner.classList.remove("flipped")
  youCardInner.classList.remove("flipped")
  showResult("Shuffling\u2026", "")
  cpuScore = 0
  youScore = 0
  cpuScoreEl.textContent = "0"
  youScoreEl.textContent = "0"
  deck = shuffle(buildDeck())
  remainingEl.textContent = deck.length + " cards remaining"
  setTimeout(function () {
    showResult("Draw to begin", "")
    drawBtn.disabled = false
    newDeckBtn.disabled = false
  }, 450)
}

async function drawCards() {
  if (deck.length < 2 || isFlipping) return
  isFlipping = true
  drawBtn.disabled = true

  cpuCardInner.classList.remove("flipped")
  youCardInner.classList.remove("flipped")
  resultText.className = ""

  await delay(80)

  const cpuCard = deck.pop()
  const youCard = deck.pop()
  remainingEl.textContent = deck.length + " cards remaining"

  cpuCardImg.src = makeCardSVG(cpuCard)
  youCardImg.src = makeCardSVG(youCard)

  await delay(130)
  cpuCardInner.classList.add("flipped")
  await delay(220)
  youCardInner.classList.add("flipped")
  await delay(560)

  const ci = VALUES.indexOf(cpuCard.value)
  const yi = VALUES.indexOf(youCard.value)

  if (ci > yi) {
    cpuScore++
    cpuScoreEl.textContent = cpuScore
    bumpScore(cpuScoreEl)
    showResult("Dealer wins the round", "cpu-win")
    flashPanel(cpuPanel, "winner-flash")
    flashPanel(youPanel, "loser-flash")
  } else if (yi > ci) {
    youScore++
    youScoreEl.textContent = youScore
    bumpScore(youScoreEl)
    showResult("You win the round!", "you-win")
    flashPanel(youPanel, "winner-flash")
    flashPanel(cpuPanel, "loser-flash")
  } else {
    showResult("\u2694 WAR \u2694", "war")
    ;[cpuPanel, youPanel].forEach(function (p) {
      p.classList.add("war-shake")
      p.addEventListener(
        "animationend",
        function () {
          p.classList.remove("war-shake")
        },
        { once: true },
      )
    })
  }

  if (deck.length === 0) {
    await delay(1300)
    endGame()
    return
  }

  drawBtn.disabled = false
  isFlipping = false
}

function endGame() {
  get("final-cpu").textContent = cpuScore
  get("final-you").textContent = youScore
  var title, trophy
  if (youScore > cpuScore) {
    title = "You Win!"
    trophy = "\uD83C\uDFC6"
  } else if (cpuScore > youScore) {
    title = "Dealer Wins"
    trophy = "\uD83D\uDC80"
  } else {
    title = "It\u2019s a Tie!"
    trophy = "\uD83E\uDD1D"
  }
  get("game-over-title").textContent = title
  get("trophy-icon").textContent = trophy
  overlay.classList.add("show")
}

newDeckBtn.addEventListener("click", newGame)
drawBtn.addEventListener("click", drawCards)
playAgainBtn.addEventListener("click", function () {
  overlay.classList.remove("show")
  newGame()
})

newGame()
