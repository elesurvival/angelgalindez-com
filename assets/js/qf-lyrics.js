(function () {
  "use strict";

  const player = window.QFPlayer;
  if (!player || window.QFLyrics) {
    return;
  }

  const storageKey = "qfLyricsPanelOpen";
  const cache = new Map();
  let activeTrackKey = "";
  let activeLineIndex = -1;
  let currentLyrics = {
    status: "empty",
    type: "none",
    track: player.getState().currentTrack,
    lines: [],
    message: "Lyrics transmission not available yet."
  };
  let userScrolling = false;
  let scrollTimer = 0;

  const parseLrc = (text) => {
    if (!text) {
      return [];
    }

    return text
      .split(/\r?\n/)
      .flatMap((line) => {
        const matches = Array.from(line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g));
        const lyric = line.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g, "").trim();
        return matches
          .map((match) => {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0")}`) : 0;
            return {
              time: minutes * 60 + seconds + fraction,
              text: lyric
            };
          })
          .filter((entry) => Number.isFinite(entry.time));
      })
      .sort((a, b) => a.time - b.time);
  };

  const parsePlain = (text) => {
    if (!text) {
      return [];
    }
    return text.split(/\r?\n/).map((line) => ({ text: line }));
  };

  const readOpenState = () => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  };

  const saveOpenState = (isOpen) => {
    try {
      localStorage.setItem(storageKey, String(isOpen));
    } catch {
      // Persistence is a nice-to-have; lyrics should still work without it.
    }
  };

  const controls = document.querySelector(".gmp-controls");
  const lyricsButton = document.createElement("button");
  lyricsButton.className = "gmp-lyrics";
  lyricsButton.type = "button";
  lyricsButton.setAttribute("aria-label", "Open Quantum Flux lyrics");
  lyricsButton.setAttribute("aria-expanded", "false");
  lyricsButton.textContent = "Lyrics";
  controls?.appendChild(lyricsButton);

  const panel = document.createElement("section");
  panel.className = "qf-lyrics-panel";
  panel.setAttribute("aria-label", "Quantum Flux lyrics");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <div class="qf-lyrics-header">
      <div>
        <p class="qf-lyrics-kicker">Lyrics Transmission</p>
        <h2 class="qf-lyrics-title">System Boot</h2>
        <p class="qf-lyrics-meta">Quantum Flux / Ciphered Realms</p>
      </div>
      <button class="qf-lyrics-close" type="button" aria-label="Close lyrics panel">Close</button>
    </div>
    <div class="qf-lyrics-body" tabindex="0" aria-live="polite"></div>
  `;
  document.body.appendChild(panel);

  const titleEl = panel.querySelector(".qf-lyrics-title");
  const metaEl = panel.querySelector(".qf-lyrics-meta");
  const bodyEl = panel.querySelector(".qf-lyrics-body");
  const closeButton = panel.querySelector(".qf-lyrics-close");

  const setOpen = (isOpen) => {
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", String(!isOpen));
    lyricsButton.classList.toggle("is-active", isOpen);
    lyricsButton.setAttribute("aria-expanded", String(isOpen));
    lyricsButton.setAttribute("aria-label", `${isOpen ? "Close" : "Open"} Quantum Flux lyrics`);
    saveOpenState(isOpen);
  };

  const renderLines = () => {
    titleEl.textContent = currentLyrics.track?.title || "Quantum Flux";
    metaEl.textContent = currentLyrics.track
      ? `${currentLyrics.track.artist} / ${currentLyrics.track.album}`
      : "Quantum Flux / Ciphered Realms";

    if (currentLyrics.status === "loading") {
      bodyEl.innerHTML = `<p class="qf-lyrics-empty">Opening lyric channel...</p>`;
      return;
    }

    if (currentLyrics.status === "error" || currentLyrics.status === "empty") {
      bodyEl.innerHTML = `<p class="qf-lyrics-empty">${currentLyrics.message}</p>`;
      return;
    }

    const lineClass = currentLyrics.type === "lrc" ? "qf-lyric-line is-synced" : "qf-lyric-line";
    bodyEl.innerHTML = currentLyrics.lines
      .map((line, index) => {
        const isBlank = !line.text;
        return `<p class="${lineClass}${isBlank ? " is-blank" : ""}" data-lyric-index="${index}">
          ${line.text || "&nbsp;"}
        </p>`;
      })
      .join("");
    activeLineIndex = -1;
  };

  const loadLyrics = async (track) => {
    const key = `${track.number}-${track.title}`;
    activeTrackKey = key;

    if (!track.lyricsType || track.lyricsType === "none") {
      currentLyrics = {
        status: "empty",
        type: "none",
        track,
        lines: [],
        message: "Lyrics transmission not available yet."
      };
      renderLines();
      return;
    }

    if (cache.has(key)) {
      currentLyrics = cache.get(key);
      renderLines();
      return;
    }

    currentLyrics = {
      status: "loading",
      type: track.lyricsType,
      track,
      lines: []
    };
    renderLines();

    try {
      let text = track.lyricsText || "";
      if (!text && track.lyricsSrc) {
        const response = await fetch(track.lyricsSrc);
        if (!response.ok) {
          throw new Error(`Lyrics request failed: ${response.status}`);
        }
        text = await response.text();
      }

      const lines = track.lyricsType === "lrc" ? parseLrc(text) : parsePlain(text);
      currentLyrics = {
        status: lines.length ? "ready" : "empty",
        type: track.lyricsType,
        track,
        lines,
        message: lines.length ? "" : "Lyrics transmission not available yet."
      };
    } catch {
      currentLyrics = {
        status: "error",
        type: track.lyricsType,
        track,
        lines: [],
        message: "Lyrics unavailable for this track."
      };
    }

    cache.set(key, currentLyrics);
    if (activeTrackKey === key) {
      renderLines();
      updateActiveLine(player.getState().currentTime);
    }
  };

  const updateActiveLine = (currentTime) => {
    if (currentLyrics.type !== "lrc" || currentLyrics.status !== "ready") {
      return;
    }

    const nextIndex = currentLyrics.lines.reduce((bestIndex, line, index) => (
      line.time <= currentTime ? index : bestIndex
    ), -1);

    if (nextIndex === activeLineIndex) {
      return;
    }

    const previous = bodyEl.querySelector(".qf-lyric-line.is-active");
    previous?.classList.remove("is-active");

    activeLineIndex = nextIndex;
    const active = bodyEl.querySelector(`[data-lyric-index="${nextIndex}"]`);
    if (!active) {
      return;
    }

    active.classList.add("is-active");
    if (panel.classList.contains("is-open") && !userScrolling) {
      active.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const syncFromPlayer = () => {
    const state = player.getState();
    if (!state.currentTrack) {
      return;
    }

    const key = `${state.currentTrack.number}-${state.currentTrack.title}`;
    if (key !== activeTrackKey) {
      loadLyrics(state.currentTrack);
    } else {
      updateActiveLine(state.currentTime);
    }
  };

  lyricsButton.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  closeButton.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      setOpen(false);
      lyricsButton.focus();
    }
  });

  bodyEl.addEventListener("scroll", () => {
    userScrolling = true;
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      userScrolling = false;
    }, 1800);
  });

  player.audio.addEventListener("timeupdate", () => updateActiveLine(player.audio.currentTime));
  window.addEventListener("qfplayer:state", syncFromPlayer);

  window.QFLyrics = {
    parseLrc,
    open: () => setOpen(true),
    close: () => setOpen(false),
    getPanelData: () => currentLyrics
  };

  setOpen(readOpenState());
  syncFromPlayer();
})();
