(function () {
  "use strict";

  const tracks = window.QF_TRACKS || [];
  if (!tracks.length || window.QFPlayer) {
    return;
  }

  const storageKey = "qfPlayerState";
  const saveIntervalMs = 1000;
  const defaultState = {
    index: 0,
    position: 0,
    volume: 0.78,
    muted: false
  };

  let lastSave = 0;
  let currentIndex = 0;

  const readState = () => {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
    } catch {
      return { ...defaultState };
    }
  };

  const clampIndex = (index) => {
    const number = Number(index);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.min(Math.max(Math.round(number), 0), tracks.length - 1);
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const normalizeSrc = (value) => {
    if (!value) {
      return "";
    }
    try {
      return new URL(value, window.location.href).pathname;
    } catch {
      return value;
    }
  };

  const trackIndexFromSource = (source) => {
    const pathname = normalizeSrc(source);
    return tracks.findIndex((track) => normalizeSrc(track.file) === pathname);
  };

  const state = readState();
  currentIndex = clampIndex(state.index);

  const audio = new Audio();
  audio.className = "global-music-player-audio";
  audio.setAttribute("aria-hidden", "true");
  audio.hidden = true;
  audio.preload = "metadata";
  audio.volume = Math.min(Math.max(Number(state.volume) || defaultState.volume, 0), 1);
  audio.muted = Boolean(state.muted);
  document.body.appendChild(audio);

  const player = document.createElement("aside");
  player.className = "global-music-player";
  player.setAttribute("aria-label", "Quantum Flux music player");
  player.innerHTML = `
    <div class="gmp-track">
      <div class="gmp-mark" aria-hidden="true">QF</div>
      <div>
        <p class="gmp-eyebrow">Quantum Flux</p>
        <p class="gmp-title">System Boot</p>
        <p class="gmp-subtitle">Ciphered Realms</p>
      </div>
    </div>
    <div class="gmp-controls" aria-label="Playback controls">
      <button class="gmp-prev" type="button" aria-label="Previous track">‹</button>
      <button class="gmp-play" type="button" aria-label="Play Quantum Flux">Play</button>
      <button class="gmp-next" type="button" aria-label="Next track">›</button>
    </div>
    <div class="gmp-progress-wrap">
      <span class="gmp-current">0:00</span>
      <input class="gmp-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Playback progress">
      <span class="gmp-duration">0:00</span>
    </div>
    <label class="gmp-volume-label">
      <span>Vol</span>
      <input class="gmp-volume" type="range" min="0" max="1" step="0.01" aria-label="Volume">
    </label>
  `;
  document.body.appendChild(player);

  const titleEl = player.querySelector(".gmp-title");
  const subtitleEl = player.querySelector(".gmp-subtitle");
  const currentEl = player.querySelector(".gmp-current");
  const durationEl = player.querySelector(".gmp-duration");
  const progressEl = player.querySelector(".gmp-progress");
  const playButton = player.querySelector(".gmp-play");
  const prevButton = player.querySelector(".gmp-prev");
  const nextButton = player.querySelector(".gmp-next");
  const volumeEl = player.querySelector(".gmp-volume");
  volumeEl.value = String(audio.volume);

  const dispatchState = () => {
    window.dispatchEvent(new CustomEvent("qfplayer:state", { detail: getPublicState() }));
  };

  const saveState = (force = false) => {
    const now = Date.now();
    if (!force && now - lastSave < saveIntervalMs) {
      return;
    }
    lastSave = now;
    localStorage.setItem(storageKey, JSON.stringify({
      index: currentIndex,
      position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      volume: audio.volume,
      muted: audio.muted
    }));
  };

  const updateTrackText = () => {
    const track = tracks[currentIndex];
    titleEl.textContent = track.title;
    subtitleEl.textContent = `${track.artist} / ${track.album}`;
    playButton.setAttribute("aria-label", `${audio.paused ? "Play" : "Pause"} ${track.title}`);
  };

  const updateProgress = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    currentEl.textContent = formatTime(current);
    durationEl.textContent = formatTime(duration);
    progressEl.max = duration ? String(duration) : "100";
    progressEl.value = String(duration ? current : 0);
  };

  const updatePlayingState = () => {
    player.classList.toggle("is-playing", !audio.paused);
    playButton.textContent = audio.paused ? "Play" : "Pause";
    updateTrackText();
    dispatchState();
  };

  const loadTrack = (index, options = {}) => {
    currentIndex = clampIndex(index);
    const track = tracks[currentIndex];
    if (normalizeSrc(audio.src) !== normalizeSrc(track.file)) {
      audio.src = track.file;
      audio.load();
    }
    updateTrackText();
    saveState(true);

    if (Number.isFinite(options.position) && options.position > 0) {
      const setPosition = () => {
        if (Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(options.position, Math.max(audio.duration - 1, 0));
          updateProgress();
          saveState(true);
        }
      };
      if (audio.readyState >= 1) {
        setPosition();
      } else {
        audio.addEventListener("loadedmetadata", setPosition, { once: true });
      }
    }

    dispatchState();
  };

  const play = async (index = currentIndex, options = {}) => {
    const requestedIndex = clampIndex(index);
    const sameTrack = requestedIndex === currentIndex && normalizeSrc(audio.src) === normalizeSrc(tracks[requestedIndex].file);
    if (!sameTrack || Number.isFinite(options.position)) {
      loadTrack(requestedIndex, options);
    }

    try {
      await audio.play();
    } catch (error) {
      console.warn("Quantum Flux playback was blocked or could not start.", error);
      updatePlayingState();
    }
  };

  const pause = () => {
    audio.pause();
    saveState(true);
  };

  const toggle = (index = currentIndex) => {
    const requestedIndex = clampIndex(index);
    if (requestedIndex === currentIndex && !audio.paused) {
      pause();
      return;
    }
    play(requestedIndex);
  };

  const next = () => {
    if (currentIndex >= tracks.length - 1) {
      pause();
      audio.currentTime = 0;
      updateProgress();
      saveState(true);
      return;
    }
    play(currentIndex + 1);
  };

  const previous = () => {
    if (audio.currentTime > 4) {
      audio.currentTime = 0;
      updateProgress();
      saveState(true);
      return;
    }
    play(currentIndex === 0 ? tracks.length - 1 : currentIndex - 1);
  };

  function getPublicState() {
    return {
      audio,
      currentIndex,
      currentTrack: tracks[currentIndex],
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      paused: audio.paused,
      volume: audio.volume,
      muted: audio.muted
    };
  }

  window.QFPlayer = {
    audio,
    tracks,
    play,
    pause,
    toggle,
    next,
    previous,
    loadTrack,
    getState: getPublicState,
    getLyricsPanelData: () => ({
      status: "placeholder",
      track: tracks[currentIndex],
      lines: []
    })
  };

  let syncQuantumRows = () => {};
  window.addEventListener("qfplayer:state", () => syncQuantumRows());

  const bindQuantumPlaylist = () => {
    const rows = Array.from(document.querySelectorAll(".playlist-row"));
    if (!rows.length) {
      return;
    }

    const setRowState = () => {
      const publicState = getPublicState();
      rows.forEach((row) => {
        const sourceIndex = trackIndexFromSource(row.dataset.audio);
        const isCurrent = sourceIndex === publicState.currentIndex;
        const isPlaying = isCurrent && !publicState.paused;
        const button = row.querySelector(".playlist-play");
        const title = row.querySelector("span")?.textContent?.trim() || "track";
        row.classList.toggle("is-playing", isPlaying);
        row.classList.toggle("is-current", isCurrent);
        if (button) {
          button.textContent = isPlaying ? "Pause" : "Play";
          button.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${title}`);
          button.setAttribute("aria-pressed", String(isPlaying));
        }
      });
    };

    rows.forEach((row) => {
      if (row.dataset.qfPlayerBound === "true") {
        return;
      }
      row.dataset.qfPlayerBound = "true";

      row.addEventListener("click", () => {
        const index = trackIndexFromSource(row.dataset.audio);
        if (index >= 0) {
          toggle(index);
        }
      });

      row.addEventListener("keydown", (event) => {
        if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }
        event.preventDefault();
        const index = trackIndexFromSource(row.dataset.audio);
        if (index >= 0) {
          toggle(index);
        }
      });
    });

    syncQuantumRows = setRowState;
    setRowState();
  };

  const bindListenNow = () => {
    const listenButton = document.querySelector(".quantum-primary[href='#ciphered-realms']");
    if (listenButton?.dataset.qfPlayerBound === "true") {
      return;
    }
    if (listenButton) {
      listenButton.dataset.qfPlayerBound = "true";
    }

    listenButton?.addEventListener("click", (event) => {
      event.preventDefault();
      const albumSection = document.getElementById("ciphered-realms");
      if (albumSection) {
        const headerOffset = 104;
        const targetTop = albumSection.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      }
      play(0);
    });
  };

  const bindPage = () => {
    bindQuantumPlaylist();
    bindListenNow();
    dispatchState();
  };

  window.QFPlayer.bindPage = bindPage;

  playButton.addEventListener("click", () => toggle(currentIndex));
  prevButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);

  progressEl.addEventListener("input", () => {
    const nextTime = Number(progressEl.value);
    if (Number.isFinite(nextTime)) {
      audio.currentTime = nextTime;
      updateProgress();
      saveState(true);
    }
  });

  volumeEl.addEventListener("input", () => {
    audio.volume = Number(volumeEl.value);
    audio.muted = false;
    saveState(true);
    dispatchState();
  });

  audio.addEventListener("loadedmetadata", () => {
    updateProgress();
    dispatchState();
  });
  audio.addEventListener("timeupdate", () => {
    updateProgress();
    saveState();
  });
  audio.addEventListener("play", updatePlayingState);
  audio.addEventListener("pause", updatePlayingState);
  audio.addEventListener("ended", next);
  window.addEventListener("pagehide", () => saveState(true));

  loadTrack(currentIndex, { position: Number(state.position) || 0 });
  updateProgress();
  bindPage();
})();
