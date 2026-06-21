(function () {
  "use strict";

  const player = window.QFPlayer;
  const tracks = window.QF_TRACKS || [];
  if (!player || !tracks.length || window.QFLibrary) {
    return;
  }

  const openStorageKey = "qfLibraryPanelOpen";
  const albumStorageKey = "qfLibrarySelectedAlbum";
  const durationCache = new Map();
  let selectedAlbum = "";

  const slugify = (value) => String(value || "collection")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "collection";

  const readStorage = (key, fallback = "") => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Local storage is optional; the library remains usable without it.
    }
  };

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "--:--";
    }
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const resolveDuration = (track) => {
    if (!track || (track.durationText && track.durationText !== "--:--")) {
      return Promise.resolve(track?.durationText || "--:--");
    }

    const source = track.file || track.src;
    if (!source) {
      return Promise.resolve("--:--");
    }

    if (durationCache.has(source)) {
      return durationCache.get(source);
    }

    const promise = new Promise((resolve) => {
      const probe = new Audio();
      const cleanup = () => {
        probe.removeAttribute("src");
        probe.load();
      };

      probe.preload = "metadata";
      probe.addEventListener("loadedmetadata", () => {
        const durationText = formatDuration(probe.duration);
        track.durationText = durationText;
        cleanup();
        resolve(durationText);
      }, { once: true });
      probe.addEventListener("error", () => {
        cleanup();
        resolve("--:--");
      }, { once: true });
      probe.src = source;
    });

    durationCache.set(source, promise);
    return promise;
  };

  const albums = Array.from(tracks.reduce((map, track) => {
    const albumTitle = track.album || "Unknown Collection";
    const slug = track.albumSlug || slugify(albumTitle);
    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        title: albumTitle,
        artist: track.artist || "Quantum Flux",
        cover: track.cover || "",
        tracks: []
      });
    }
    map.get(slug).tracks.push(track);
    return map;
  }, new Map()).values()).map((album) => ({
    ...album,
    tracks: album.tracks.sort((a, b) => (a.trackNumber || a.index + 1) - (b.trackNumber || b.index + 1))
  }));

  selectedAlbum = readStorage(albumStorageKey, albums[0]?.slug || "");
  if (!albums.some((album) => album.slug === selectedAlbum)) {
    selectedAlbum = albums[0]?.slug || "";
  }

  const controls = document.querySelector(".gmp-controls");
  const libraryButton = document.createElement("button");
  libraryButton.className = "gmp-library";
  libraryButton.type = "button";
  libraryButton.setAttribute("aria-label", "Open Quantum Flux music library");
  libraryButton.setAttribute("aria-expanded", "false");
  libraryButton.textContent = "Library";
  controls?.appendChild(libraryButton);

  const panel = document.createElement("section");
  panel.className = "qf-library-panel";
  panel.setAttribute("aria-label", "Quantum Flux music library");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <div class="qf-library-header">
      <div>
        <p class="qf-library-kicker">Quantum Flux Music Library</p>
        <h2 class="qf-library-title">Ciphered Realms</h2>
        <p class="qf-library-meta">Browse collections without leaving the site.</p>
      </div>
      <button class="qf-library-close" type="button" aria-label="Close music library">Close</button>
    </div>
    <div class="qf-library-layout">
      <aside class="qf-library-albums" aria-label="Quantum Flux collections"></aside>
      <div class="qf-library-main">
        <div class="qf-library-now" aria-live="polite"></div>
        <div class="qf-library-tracks" aria-label="Tracks in selected collection"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const titleEl = panel.querySelector(".qf-library-title");
  const albumsEl = panel.querySelector(".qf-library-albums");
  const nowEl = panel.querySelector(".qf-library-now");
  const tracksEl = panel.querySelector(".qf-library-tracks");
  const closeButton = panel.querySelector(".qf-library-close");

  const getSelectedAlbum = () => albums.find((album) => album.slug === selectedAlbum) || albums[0];

  const setOpen = (isOpen) => {
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", String(!isOpen));
    libraryButton.classList.toggle("is-active", isOpen);
    libraryButton.setAttribute("aria-expanded", String(isOpen));
    libraryButton.setAttribute("aria-label", `${isOpen ? "Close" : "Open"} Quantum Flux music library`);
    writeStorage(openStorageKey, String(isOpen));
  };

  const coverMarkup = (album, className) => {
    if (album?.cover) {
      return `<img class="${className}" src="${album.cover}" alt="">`;
    }
    return `<div class="${className} is-placeholder" aria-hidden="true">QF</div>`;
  };

  const renderAlbums = () => {
    albumsEl.innerHTML = albums.map((album) => `
      <button class="qf-album-button${album.slug === selectedAlbum ? " is-selected" : ""}" type="button" data-album="${album.slug}" aria-pressed="${album.slug === selectedAlbum}">
        ${coverMarkup(album, "qf-album-cover")}
        <span>
          <strong>${album.title}</strong>
          <small>${album.tracks.length} tracks</small>
        </span>
      </button>
    `).join("");
  };

  const renderNowPlaying = () => {
    const state = player.getState();
    const track = state.currentTrack || tracks[0];
    const album = albums.find((item) => item.slug === (track.albumSlug || slugify(track.album))) || getSelectedAlbum();
    nowEl.innerHTML = `
      ${coverMarkup(album, "qf-now-cover")}
      <div>
        <p class="qf-now-kicker">${state.paused ? "Selected Track" : "Now Playing"}</p>
        <h3>${track.title}</h3>
        <p>${track.artist || "Quantum Flux"} / ${track.album || "Ciphered Realms"}</p>
      </div>
    `;
  };

  const renderTracks = () => {
    const album = getSelectedAlbum();
    const state = player.getState();
    titleEl.textContent = album?.title || "Music Library";
    tracksEl.innerHTML = (album?.tracks || []).map((track) => {
      const isCurrent = track.index === state.currentIndex;
      const isPlaying = isCurrent && !state.paused;
      return `
        <button class="qf-library-track${isCurrent ? " is-current" : ""}${isPlaying ? " is-playing" : ""}" type="button" data-track-index="${track.index}" aria-pressed="${isPlaying}">
          <span class="qf-track-number">${track.number || String(track.trackNumber || track.index + 1).padStart(2, "0")}</span>
          <span class="qf-track-copy">
            <strong>${track.title}</strong>
            <small>${track.tags?.slice(0, 3).join(" / ") || track.album || "Quantum Flux"}</small>
          </span>
          <span class="qf-track-duration">${track.durationText || "--:--"}</span>
          <span class="qf-track-state">${isPlaying ? "Playing" : isCurrent ? "Selected" : "Play"}</span>
        </button>
      `;
    }).join("");
  };

  const resolveVisibleDurations = () => {
    const album = getSelectedAlbum();
    (album?.tracks || []).forEach((track) => {
      resolveDuration(track).then((durationText) => {
        if (durationText === "--:--" || getSelectedAlbum()?.slug !== album.slug) {
          return;
        }
        const durationEl = tracksEl.querySelector(`[data-track-index="${track.index}"] .qf-track-duration`);
        if (durationEl) {
          durationEl.textContent = durationText;
        }
      });
    });
  };

  const render = () => {
    renderAlbums();
    renderNowPlaying();
    renderTracks();
    resolveVisibleDurations();
  };

  const selectAlbum = (slug) => {
    if (!albums.some((album) => album.slug === slug)) {
      return;
    }
    selectedAlbum = slug;
    writeStorage(albumStorageKey, slug);
    render();
  };

  const selectTrack = (index) => {
    const trackIndex = Number(index);
    if (!Number.isFinite(trackIndex)) {
      return;
    }
    player.toggle(trackIndex);
  };

  libraryButton.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  closeButton.addEventListener("click", () => setOpen(false));

  panel.addEventListener("click", (event) => {
    const albumButton = event.target.closest(".qf-album-button");
    if (albumButton) {
      selectAlbum(albumButton.dataset.album);
      return;
    }

    const trackButton = event.target.closest(".qf-library-track");
    if (trackButton) {
      selectTrack(trackButton.dataset.trackIndex);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      setOpen(false);
      libraryButton.focus();
    }
  });

  window.addEventListener("qfplayer:state", render);

  window.QFLibrary = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    render,
    getAlbums: () => albums.map((album) => ({ ...album, tracks: [...album.tracks] }))
  };

  render();
  setOpen(player.isCollapsed?.() ? false : readStorage(openStorageKey) === "true");
})();
