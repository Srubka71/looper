let currentAudio = new Audio();

let currentBeat = null;
let isPlaying = false;
let currentButton = null;

let loopTarget = "off";
let loopCounter = 0;

// =======================
// BROWSER DETECTION
// =======================

const isSafari =
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  document.documentElement.classList.add("is-safari");
}

// =======================
// UI REFERENCES
// =======================

const introScreen = document.getElementById("introScreen");
const welcomeModal = document.getElementById("welcomeModal");
const closeWelcomeBtn = document.getElementById("closeWelcomeBtn");
const dontShowWelcome = document.getElementById("dontShowWelcome");

const grid = document.getElementById("beatGrid");

const img = document.getElementById("beatImage");
const title = document.getElementById("title");
const producer = document.getElementById("producer");
const bpm = document.getElementById("bpm");
const infoText = document.getElementById("infoText");

const pitch = document.getElementById("pitch");
const pitchLabel = document.getElementById("pitchLabel");

const stopBtn = document.getElementById("stopBtn");
const restartBtn = document.getElementById("restartBtn");

const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");

const bugBtn = document.getElementById("bugBtn");

const skipIntroBtn = document.getElementById("skipIntroBtn");

// =======================
// INTRO + WELCOME
// =======================

let introTimer = null;
let introSkipped = false;

function showWelcomeIfNeeded() {
  const hideWelcome = localStorage.getItem("spolooperHideWelcome");

  if (hideWelcome !== "true") {
    welcomeModal.classList.remove("hidden");
  }
}

function finishIntro() {
  if (introSkipped) return;

  introSkipped = true;

  if (introTimer) {
    clearTimeout(introTimer);
  }

  introScreen.classList.add("hidden");

  showWelcomeIfNeeded();
}

window.addEventListener("load", () => {
  introTimer = setTimeout(() => {
    finishIntro();
  }, 6000);
});

introScreen.addEventListener("click", () => {
  finishIntro();
});

skipIntroBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  finishIntro();
});

// =======================
// WELCOME MODAL
// =======================

closeWelcomeBtn.addEventListener("click", () => {
  if (dontShowWelcome.checked) {
    localStorage.setItem("spolooperHideWelcome", "true");
  }

  welcomeModal.classList.add("hidden");
});

// =======================
// HELPERS
// =======================

function setPlayingVisualState(isActive) {
  if (isActive) {
    document.body.classList.add("is-playing");
  } else {
    document.body.classList.remove("is-playing");
  }
}

function randomGlowColor() {
  const colors = [
    "#EAA221",
    "#dd4124",
    "#00e5ff",
    "#ff00c8",
    "#7CFF00",
    "#ffffff",
    "#8f5cff"
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

function getBeatInfo(beat) {
  if (!beat.available || !beat.file) {
    return "Coming Soon...";
  }

  return `${beat.producer} — ${beat.title} — ${beat.bpm} BPM`;
}

function updateInfoBar(text) {
  if (infoText) {
    infoText.innerText = text;
  }
}

function updateBpmDisplay() {
  if (!currentBeat || !currentBeat.bpm) {
    bpm.innerText = "BPM: --";
    return;
  }

  const rate = parseFloat(pitch.value);
  const calculatedBpm = currentBeat.bpm * rate;

  bpm.innerText = `BPM: ${calculatedBpm.toFixed(2)}`;
}

function resetActiveButtons() {
  document.querySelectorAll(".beat-tile").forEach(button => {
    button.classList.remove("active");
  });
}

function getAvailableBeats() {
  return allBeats.filter(beat => beat.available && beat.file);
}

function findButtonByBeatId(id) {
  return document.querySelector(`.beat-tile[data-id="${id}"]`);
}

function stopPlaybackCompletely() {
  currentAudio.pause();
  currentAudio.currentTime = 0;

  isPlaying = false;
  stopBtn.innerText = "START";

  loopCounter = 0;

  setPlayingVisualState(false);
}

// =======================
// BUILD ALL SLOTS
// =======================

const totalSlots =
  typeof TOTAL_SLOTS !== "undefined"
    ? TOTAL_SLOTS
    : 36;

const allBeats = Array.from({ length: totalSlots }, (_, i) => {
  const id = i + 1;

  const existingBeat = beats.find(beat => beat.id === id);

  if (existingBeat) {
    return existingBeat;
  }

  return {
    id: id,
    title: `Beat ${id}`,
    producer: "Coming Soon",
    bpm: null,
    file: "",
    image: `assets/images/beat${id}.jpg`,
    available: false
  };
});

// =======================
// CREATE BEAT TILES
// =======================

allBeats.forEach((beat) => {
  const btn = document.createElement("button");

  btn.classList.add("beat-tile");
  btn.dataset.id = beat.id;

  if (beat.available && beat.file) {
    btn.classList.add("available");
  } else {
    btn.classList.add("unavailable");
  }

  btn.style.backgroundImage = `url("${beat.image}")`;

  btn.style.setProperty(
    "--glow-color",
    randomGlowColor()
  );

  btn.innerHTML = `<span>${beat.id}</span>`;

  btn.addEventListener("mouseenter", () => {
    btn.style.setProperty(
      "--glow-color",
      randomGlowColor()
    );

    updateInfoBar(getBeatInfo(beat));
  });

  btn.addEventListener("mouseleave", () => {
    if (currentBeat) {
      updateInfoBar(getBeatInfo(currentBeat));
    } else {
      updateInfoBar("Najedź na kafelek albo wybierz beat");
    }
  });

  btn.addEventListener("click", () => {
    if (!beat.available || !beat.file) {
      updateInfoBar("Coming Soon...");
      return;
    }

    loadBeat(beat, btn);
  });

  grid.appendChild(btn);
});

// =======================
// LOAD BEAT
// =======================

function loadBeat(beat, btn) {
  resetActiveButtons();

  currentAudio.pause();
  currentAudio.currentTime = 0;

  loopCounter = 0;

  currentBeat = beat;
  currentButton = btn;

  img.classList.add("changing");

  const coverPanel = document.querySelector(".cover-panel");
  const infoBar = document.querySelector(".info-bar");

  setTimeout(() => {
    currentAudio = new Audio(beat.file);

    currentAudio.loop = false;
    currentAudio.playbackRate = parseFloat(pitch.value);

    currentAudio.addEventListener("ended", handleBeatEnded);

    currentAudio.play();

    isPlaying = true;
    stopBtn.innerText = "STOP";

    setPlayingVisualState(true);

    if (img) {
      img.src = beat.image || "";
    }

    if (title) {
      title.innerText = beat.title || "";
    }

    if (producer) {
      producer.innerText = beat.producer || "";
    }

    updateBpmDisplay();
    updateInfoBar(getBeatInfo(beat));

    btn.classList.add("active");

    setTimeout(() => {
      img.classList.remove("changing");
    }, 60);

    coverPanel.classList.remove("active-cover");
    infoBar.classList.remove("active-info");

    void coverPanel.offsetWidth;
    void infoBar.offsetWidth;

    coverPanel.classList.add("active-cover");
    infoBar.classList.add("active-info");
  }, 220);
}

// =======================
// LOOP ENGINE
// =======================

function handleBeatEnded() {
  if (loopTarget === "off") {
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  loopCounter++;

  if (loopCounter < loopTarget) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  playNextAvailableBeat();
}

function playNextAvailableBeat() {
  const availableBeats = getAvailableBeats();

  if (!currentBeat) return;

  const currentIndex = availableBeats.findIndex(
    beat => beat.id === currentBeat.id
  );

  const nextBeat = availableBeats[currentIndex + 1];

  if (!nextBeat) {
    stopPlaybackCompletely();
    updateInfoBar("Koniec playlisty");
    return;
  }

  const nextButton = findButtonByBeatId(nextBeat.id);

  if (nextButton) {
    loadBeat(nextBeat, nextButton);
  }
}

// =======================
// LOOP BUTTONS
// =======================

document.querySelectorAll(".loop-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".loop-btn").forEach(btn => {
      btn.classList.remove("active-loop");
    });

    button.classList.add("active-loop");

    if (button.dataset.loop === "off") {
      loopTarget = "off";
      updateInfoBar("Loop OFF: aktualny beat gra w pętli");
    } else {
      loopTarget = parseInt(button.dataset.loop, 10);
      updateInfoBar(`Auto-next po ${loopTarget}x`);
    }

    loopCounter = 0;
  });
});

// =======================
// STOP / START
// =======================

stopBtn.addEventListener("click", () => {
  if (!currentAudio.src) return;

  if (isPlaying) {
    currentAudio.pause();

    isPlaying = false;
    stopBtn.innerText = "START";

    setPlayingVisualState(false);
  } else {
    currentAudio.play();

    isPlaying = true;
    stopBtn.innerText = "STOP";

    setPlayingVisualState(true);
  }
});

// =======================
// RESTART
// =======================

restartBtn.addEventListener("click", () => {
  if (!currentAudio.src) return;

  loopCounter = 0;

  currentAudio.currentTime = 0;
  currentAudio.play();

  isPlaying = true;
  stopBtn.innerText = "STOP";

  setPlayingVisualState(true);
});

// =======================
// PITCH
// =======================

pitch.addEventListener("input", () => {
  const value = parseFloat(pitch.value);

  if (currentAudio) {
    currentAudio.playbackRate = value;
  }

  const percent = ((value - 1) * 10).toFixed(2);

  if (pitchLabel) {
    pitchLabel.innerText = `Pitch: ${percent}%`;
  }

  updateBpmDisplay();
});

function setPitch(delta) {
  let value = parseFloat(pitch.value) + delta;

  value = Math.max(
    0.80,
    Math.min(1.20, value)
  );

  pitch.value = value;

  pitch.dispatchEvent(new Event("input"));
}

document.getElementById("pitchPlus1").onclick = () => setPitch(0.10);
document.getElementById("pitchMinus1").onclick = () => setPitch(-0.10);

document.getElementById("pitchPlus025").onclick = () => setPitch(0.025);
document.getElementById("pitchMinus025").onclick = () => setPitch(-0.025);

document.getElementById("pitchReset").onclick = () => {
  pitch.value = 1;
  pitch.dispatchEvent(new Event("input"));
};

// =======================
// HELP MODAL
// =======================

helpBtn.addEventListener("click", () => {
  helpModal.classList.remove("hidden");
});

closeHelpBtn.addEventListener("click", () => {
  helpModal.classList.add("hidden");
});

helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    helpModal.classList.add("hidden");
  }
});

// =======================
// BUG REPORT
// =======================

bugBtn.addEventListener("click", () => {
  window.location.href =
    "mailto:vertuigames@gmail.com?subject=Looper Bug Report";
});

// =======================
// PARALLAX / DEPTH — COVER ONLY
// =======================

document.addEventListener("mousemove", (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 2;
  const y = (event.clientY / window.innerHeight - 0.5) * 2;

  document.body.style.setProperty("--mouse-x", x.toFixed(3));
  document.body.style.setProperty("--mouse-y", y.toFixed(3));

  if (img) {
    img.style.transform = `
      translate3d(${x * 10}px, ${y * 8}px, 0)
      scale(1.03)
    `;
  }
});

document.addEventListener("mouseleave", () => {
  if (img) {
    img.style.transform = "translate3d(0, 0, 0) scale(1)";
  }
});
