const yesBtn = document.getElementById("yes");
const noBtn  = document.getElementById("no");
const btnRow = document.querySelector(".btnrow");

// tryby: "count" -> "escape" -> po złapaniu -> "swap" -> klik wyskakującego -> "final"
let mode = "count";

let noClicks = 0;
let swapped = false;

// Teksty dla czerwonego
const noTexts = [
  "NIE",
  "Serio nie?",
  "Na pewno?",
  "Ostatnia szansa..",
  "okej..."
];

// Ucieczka
let escapeMode = false;
const padding = 12;
const step = 15;

// Skalowanie zielonego (jak u Ciebie — nie wpływa na layout)
const growPerClick = 0.20;
const maxYesScale = 2.2;

// Stan początkowy do resetu
const initialNoText = noBtn.textContent;
const initialYesTransform = yesBtn.style.transform || "";

// -------------------- DRUGI (OSOBNY) WYSKAKUJĄCY PRZYCISK --------------------
const noPeekBtn = noBtn.cloneNode(true);
noPeekBtn.id = "no-peek";
noPeekBtn.textContent = "NIE";
document.body.appendChild(noPeekBtn);

let peekTimeoutId = null;
let peeking = false;

// Harmonogram: pierwszy raz 8s, potem co 6s
let peekLoopActive = false;
let peekFirstTimerId = null;
let peekIntervalId = null;

function startPeekLoop() {
  if (peekLoopActive) return;
  peekLoopActive = true;

  // pierwszy wyskok po 8 sekundach
  peekFirstTimerId = setTimeout(() => {
    if (!peekLoopActive || mode !== "swap") return;
    triggerPeek();

    // kolejne co 6 sekund
    peekIntervalId = setInterval(() => {
      if (mode !== "swap") return;
      triggerPeek();
    }, 6000);
  }, 9000);
}

function stopPeekLoop() {
  peekLoopActive = false;

  if (peekFirstTimerId) clearTimeout(peekFirstTimerId);
  peekFirstTimerId = null;

  if (peekIntervalId) clearInterval(peekIntervalId);
  peekIntervalId = null;

  if (peekTimeoutId) clearTimeout(peekTimeoutId);
  peekTimeoutId = null;

  peeking = false;
  noPeekBtn.classList.remove("peek");
}

// Losowy wyskok z dołu (X losowe, bez wyjazdu za ekran)
function triggerPeek() {
  if (mode !== "swap") return;
  if (peeking) return;

  const rect = noPeekBtn.getBoundingClientRect();
  const w = rect.width || 120;

  const minX = padding + w / 2;
  const maxX = window.innerWidth - padding - w / 2;
  const randomX = minX + Math.random() * Math.max(0, (maxX - minX));

  noPeekBtn.style.left = `${randomX}px`;

  peeking = true;

  noPeekBtn.classList.remove("peek");
  void noPeekBtn.offsetWidth;
  noPeekBtn.classList.add("peek");

  if (peekTimeoutId) clearTimeout(peekTimeoutId);
  peekTimeoutId = setTimeout(() => {
    noPeekBtn.classList.remove("peek");
    peeking = false;
  }, 750);
}

// Kliknięcie wyskakującego "NIE" => finalna faza
noPeekBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (mode !== "swap") return;
  if (!peeking) return;

  enterFinalPhase();
});

// -------------------- utils --------------------
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function getBounds() {
  const rect = noBtn.getBoundingClientRect();
  const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
  const maxTop  = Math.max(padding, window.innerHeight - rect.height - padding);
  return { rect, maxLeft, maxTop };
}

function keepInsideViewport(left, top) {
  const { maxLeft, maxTop } = getBounds();
  return {
    left: clamp(left, padding, maxLeft),
    top:  clamp(top,  padding, maxTop)
  };
}

// -------------------- YES grow (scale) --------------------
function increaseYesSize() {
  const targetScale = clamp(1 + noClicks * growPerClick, 1, maxYesScale);
  yesBtn.style.transform = `scale(${targetScale})`;
}

// -------------------- Escape mode --------------------
function enableEscapeMode() {
  if (escapeMode) return;

  const r = noBtn.getBoundingClientRect();
  escapeMode = true;

  noBtn.classList.add("escape");
  noBtn.classList.remove("smooth");
  noBtn.style.left = `${r.left}px`;
  noBtn.style.top  = `${r.top}px`;

  requestAnimationFrame(() => {
    noBtn.classList.add("smooth");
  });
}

function flee(e) {
  if (!escapeMode) return;

  const { rect } = getBounds();
  const btnCx = rect.left + rect.width / 2;
  const btnCy = rect.top  + rect.height / 2;

  let dx = btnCx - e.clientX;
  let dy = btnCy - e.clientY;

  let len = Math.hypot(dx, dy);
  if (len < 0.001) {
    const a = Math.random() * Math.PI * 2;
    dx = Math.cos(a);
    dy = Math.sin(a);
    len = 1;
  }

  dx /= len;
  dy /= len;

  const currentLeft = parseFloat(noBtn.style.left) || rect.left;
  const currentTop  = parseFloat(noBtn.style.top)  || rect.top;

  const target = keepInsideViewport(
    currentLeft + dx * step,
    currentTop  + dy * step
  );

  noBtn.style.left = `${target.left}px`;
  noBtn.style.top  = `${target.top}px`;
}

// -------------------- Swap-only mode (TYLKO na normalnym czerwonym) --------------------
function swapButtons() {
  if (!btnRow) return;

  if (!swapped) {
    btnRow.insertBefore(noBtn, yesBtn);
    swapped = true;
  } else {
    btnRow.insertBefore(yesBtn, noBtn);
    swapped = false;
  }
}

// -------------------- Reset -> swap-only --------------------
function resetToSwapMode() {
  noClicks = 0;

  noBtn.textContent = initialNoText;
  yesBtn.style.transform = initialYesTransform;

  escapeMode = false;
  noBtn.classList.remove("escape", "smooth");
  noBtn.style.left = "";
  noBtn.style.top  = "";

  if (swapped && btnRow) {
    btnRow.insertBefore(yesBtn, noBtn);
    swapped = false;
  }

  mode = "swap";
  startPeekLoop();
}

// -------------------- Final phase: zostaje tylko TAK --------------------
function enterFinalPhase() {
  mode = "final";
  stopPeekLoop();

  if (noBtn && noBtn.parentNode) noBtn.parentNode.removeChild(noBtn);
  if (noPeekBtn && noPeekBtn.parentNode) noPeekBtn.parentNode.removeChild(noPeekBtn);
}

// -------------------- Click on NO (normalny czerwony) --------------------
noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (mode === "final") return;

  if (mode === "swap") return;

  if (mode === "escape") {
    resetToSwapMode();
    return;
  }

  noClicks += 1;

  if (noClicks <= 4) {
    noBtn.textContent = noTexts[noClicks] ?? "NIE";
    increaseYesSize();
    return;
  }

  noBtn.textContent = noTexts[4];
  mode = "escape";
  enableEscapeMode();
  flee(e);
});

// -------------------- Hover / move on normalnym NO --------------------
noBtn.addEventListener("pointerenter", (e) => {
  if (mode === "final") return;

  if (mode === "swap") {
    swapButtons();
    return;
  }
  if (mode === "escape") flee(e);
});

noBtn.addEventListener("pointermove", (e) => {
  if (mode === "escape") flee(e);
});

// -------------------- Resize safe (tylko ucieczka) --------------------
window.addEventListener("resize", () => {
  if (!escapeMode) return;

  const left = parseFloat(noBtn.style.left) || 0;
  const top  = parseFloat(noBtn.style.top)  || 0;

  const fixed = keepInsideViewport(left, top);
  noBtn.style.left = `${fixed.left}px`;
  noBtn.style.top  = `${fixed.top}px`;
});

// -------------------- YES click: redirect --------------------
yesBtn.addEventListener("click", () => {
  window.location.href = "https://dezet00.github.io/Stronkaa/";
});
