let currentAudio = new Audio();

let currentBeat = null;
let isPlaying = false;
let currentButton = null;

let loopTarget = "off";
let loopCounter = 0;
let infoTimer = null;

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
const bugModal = document.getElementById("bugModal");
const closeBugBtn = document.getElementById("closeBugBtn");
const sendBugBtn = document.getElementById("sendBugBtn");

const submitBeatBtn = document.getElementById("submitBeatBtn");
const submitBeatModal = document.getElementById("submitBeatModal");
const closeSubmitBeatBtn = document.getElementById("closeSubmitBeatBtn");
const sendBeatBtn = document.getElementById("sendBeatBtn");

const voteTotal = document.getElementById("voteTotal");
const voteDownBtn = document.getElementById("voteDownBtn");
const voteUpBtn = document.getElementById("voteUpBtn");

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

  updateVotePanel();
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

function clearInfoBar() {
  if (infoTimer) {
    clearTimeout(infoTimer);
  }

  if (infoText) {
    infoText.innerText = "";
  }
}

function updateInfoBar(text, autoClear = true) {
  if (!infoText) return;

  if (infoTimer) {
    clearTimeout(infoTimer);
  }

  infoText.innerText = text;

  if (autoClear) {
    infoTimer = setTimeout(() => {
      infoText.innerText = "";
    }, 4000);
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
  updateInfoBar("Koniec playlisty");
}

function clickLoopButton(loopValue) {
  const button = document.querySelector(`.loop-btn[data-loop="${loopValue}"]`);

  if (button) {
    button.click();
  }
}

function isTypingInForm(event) {
  const tag = event.target.tagName.toLowerCase();

  return (
    tag === "input" ||
    tag === "textarea" ||
    event.target.isContentEditable
  );
}

function isModalOpen() {
  const openedModal = document.querySelector(
    ".community-modal:not(.hidden), .help-modal:not(.hidden), .welcome-modal:not(.hidden)"
  );

  return Boolean(openedModal);
}

function closeAllCommunityModals() {
  document.querySelectorAll(".community-modal").forEach(modal => {
    modal.classList.add("hidden");
  });
}

// =======================
// LOCAL VOTING
// =======================

function getVoteKey(beatId) {
  return `spolooperVote_${beatId}`;
}

function getCurrentVoteValue(beatId) {
  const savedVote = localStorage.getItem(getVoteKey(beatId));
  const voteValue = parseInt(savedVote, 10);

  if (voteValue === 1 || voteValue === -1) {
    return voteValue;
  }

  return 0;
}

function saveCurrentVoteValue(beatId, value) {
  if (value === 0) {
    localStorage.removeItem(getVoteKey(beatId));
    return;
  }

  localStorage.setItem(getVoteKey(beatId), String(value));
}

function updateVotePanel() {
  if (!voteTotal || !voteDownBtn || !voteUpBtn) return;

  if (!currentBeat || !currentBeat.available || !currentBeat.file) {
    voteTotal.innerText = "0";

    voteDownBtn.classList.remove("active-vote");
    voteUpBtn.classList.remove("active-vote");

    voteDownBtn.setAttribute("aria-pressed", "false");
    voteUpBtn.setAttribute("aria-pressed", "false");

    return;
  }

  const voteValue = getCurrentVoteValue(currentBeat.id);

  voteTotal.innerText = String(voteValue);

  voteDownBtn.classList.toggle("active-vote", voteValue === -1);
  voteUpBtn.classList.toggle("active-vote", voteValue === 1);

  voteDownBtn.setAttribute("aria-pressed", voteValue === -1 ? "true" : "false");
  voteUpBtn.setAttribute("aria-pressed", voteValue === 1 ? "true" : "false");
}

function handleVote(selectedValue) {
  if (!currentBeat || !currentBeat.available || !currentBeat.file) {
    updateInfoBar("Najpierw wybierz beat");
    return;
  }

  const oldValue = getCurrentVoteValue(currentBeat.id);

  let newValue = selectedValue;

  if (oldValue === selectedValue) {
    newValue = 0;
  }

  saveCurrentVoteValue(currentBeat.id, newValue);
  updateVotePanel();

  if (newValue === 1) {
    updateInfoBar("Głos: Zajebiste!");
  } else if (newValue === -1) {
    updateInfoBar("Głos: Nie siedzi mi...");
  } else {
    updateInfoBar("Głos cofnięty");
  }
}

if (voteUpBtn) {
  voteUpBtn.addEventListener("mouseenter", () => {
    updateInfoBar("Zajebisty beat!", false);
  });

  voteUpBtn.addEventListener("mouseleave", () => {
    clearInfoBar();
  });

  voteUpBtn.addEventListener("click", () => {
    handleVote(1);
  });
}

if (voteDownBtn) {
  voteDownBtn.addEventListener("mouseenter", () => {
    updateInfoBar("Nie siedzi mi..", false);
  });

  voteDownBtn.addEventListener("mouseleave", () => {
    clearInfoBar();
  });

  voteDownBtn.addEventListener("click", () => {
    handleVote(-1);
  });
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

    updateInfoBar(getBeatInfo(beat), false);
  });

  btn.addEventListener("mouseleave", () => {
    clearInfoBar();
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

  clearInfoBar();
  updateVotePanel();

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
    updateVotePanel();

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
      updateInfoBar("Loop OFF");
    } else {
      loopTarget = parseInt(button.dataset.loop, 10);
      updateInfoBar(`Loop ${loopTarget}x`);
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
    updateInfoBar("STOP");
  } else {
    currentAudio.play();

    isPlaying = true;
    stopBtn.innerText = "STOP";

    setPlayingVisualState(true);
    updateInfoBar("START");
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
  updateInfoBar("RESTART");
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
  updateInfoBar("Pitch reset");
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
// BUG MODAL
// =======================

bugBtn.addEventListener("click", () => {
  if (bugModal) {
    bugModal.classList.remove("hidden");
  }
});

if (closeBugBtn && bugModal) {
  closeBugBtn.addEventListener("click", () => {
    bugModal.classList.add("hidden");
  });
}

if (bugModal) {
  bugModal.addEventListener("click", (event) => {
    if (event.target === bugModal) {
      bugModal.classList.add("hidden");
    }
  });
}

if (sendBugBtn) {
  sendBugBtn.addEventListener("click", () => {
    const name = document.getElementById("bugName").value;
    const email = document.getElementById("bugEmail").value;
    const message = document.getElementById("bugMessage").value;

    const subject = encodeURIComponent("Looper by Spokultura — Bug Report");

    const body = encodeURIComponent(
      `ZGŁOSZENIE BUGA\n\n` +
      `Imię / ksywa: ${name}\n` +
      `Email: ${email}\n\n` +
      `Opis błędu:\n${message}\n\n` +
      `Strona: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}`
    );

    window.location.href =
      `mailto:vertuigames@gmail.com?subject=${subject}&body=${body}`;
  });
}

// =======================
// SUBMIT BEAT MODAL
// =======================

if (submitBeatBtn && submitBeatModal) {
  submitBeatBtn.addEventListener("click", () => {
    submitBeatModal.classList.remove("hidden");
  });
}

if (closeSubmitBeatBtn && submitBeatModal) {
  closeSubmitBeatBtn.addEventListener("click", () => {
    submitBeatModal.classList.add("hidden");
  });
}

if (submitBeatModal) {
  submitBeatModal.addEventListener("click", (event) => {
    if (event.target === submitBeatModal) {
      submitBeatModal.classList.add("hidden");
    }
  });
}

if (sendBeatBtn) {
  sendBeatBtn.addEventListener("click", () => {
    const nick = document.getElementById("beatNick").value;
    const email = document.getElementById("beatEmail").value;
    const beatTitle = document.getElementById("beatTitle").value;
    const bpmValue = document.getElementById("beatBpm").value;
    const link = document.getElementById("beatLink").value;
    const notes = document.getElementById("beatNotes").value;
    const rights = document.getElementById("beatRights").checked;

    if (!rights) {
      alert("Musisz potwierdzić, że masz prawa do beatu i sampli.");
      return;
    }

    const subject = encodeURIComponent("Looper by Spokultura — Beat Submission");

    const body = encodeURIComponent(
      `ZGŁOSZENIE BEATU DO LOOPERA\n\n` +
      `Ksywa producenta: ${nick}\n` +
      `Email: ${email}\n` +
      `Tytuł beatu: ${beatTitle}\n` +
      `BPM: ${bpmValue}\n` +
      `Link do beatu: ${link}\n\n` +
      `Dodatkowe info:\n${notes}\n\n` +
      `Oświadczenie: Potwierdzam, że beat oraz użyte sample należą do mnie lub mam prawo je udostępnić.\n` +
      `Strona: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}`
    );

    window.location.href =
      `mailto:vertuigames@gmail.com?subject=${subject}&body=${body}`;
  });
}

// =======================
// KEYBOARD SHORTCUTS
// =======================

document.addEventListener("keydown", (event) => {
  if (isTypingInForm(event)) return;

  if (isModalOpen()) {
    if (event.key === "Escape") {
      closeAllCommunityModals();
      helpModal.classList.add("hidden");
    }

    return;
  }

  const key = event.key.toLowerCase();

  if (event.code === "Space") {
    event.preventDefault();
    stopBtn.click();
  }

  if (key === "r") {
    event.preventDefault();
    restartBtn.click();
  }

  if (event.code === "Backquote") {
    event.preventDefault();
    clickLoopButton("off");
  }

  if (key === "1") {
    event.preventDefault();
    clickLoopButton("1");
  }

  if (key === "2") {
    event.preventDefault();
    clickLoopButton("2");
  }

  if (key === "3") {
    event.preventDefault();
    clickLoopButton("4");
  }

  if (key === "4") {
    event.preventDefault();
    clickLoopButton("6");
  }

  if (key === "5") {
    event.preventDefault();
    clickLoopButton("8");
  }

  if (event.code === "ArrowRight") {
    event.preventDefault();
    setPitch(0.025);
    updateInfoBar("Pitch +0.25");
  }

  if (event.code === "ArrowLeft") {
    event.preventDefault();
    setPitch(-0.025);
    updateInfoBar("Pitch -0.25");
  }
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