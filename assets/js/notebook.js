(function () {
  "use strict";

  const defaultSource = "/assets/data/live-notebook.json";
  let initializedRoot = null;
  let pages = [];
  let currentIndex = 0;

  const selectors = {
    root: "[data-live-notebook]",
    entryList: "[data-entry-list]",
    entryCount: "[data-entry-count]",
    notebookTitle: "[data-notebook-title]",
    notebookSubtitle: "[data-notebook-subtitle]",
    noteMeta: "[data-note-meta]",
    noteTitle: "[data-note-title]",
    noteBody: "[data-note-body]",
    noteTags: "[data-note-tags]",
    noteFoot: "[data-note-foot]",
    pageCount: "[data-page-count]",
    previous: "[data-notebook-prev]",
    next: "[data-notebook-next]",
    share: "[data-share-entry]",
    print: "[data-print-entry]",
    status: "[data-notebook-status]"
  };

  const formatDate = (value) => {
    const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) {
      return "Undated";
    }

    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const setText = (root, selector, value) => {
    const node = root.querySelector(selector);
    if (node) {
      node.textContent = value;
    }
  };

  const clearNode = (node) => {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };

  const getPageHash = () => decodeURIComponent(window.location.hash.replace(/^#/, ""));

  const indexFromHash = () => {
    const hash = getPageHash();
    if (!hash) {
      return -1;
    }

    return pages.findIndex((page) => page.id === hash);
  };

  const updateHash = (page) => {
    if (!page?.id || window.location.hash === `#${page.id}`) {
      return;
    }

    window.history.replaceState(null, "", `#${encodeURIComponent(page.id)}`);
  };

  const renderEntryList = (root) => {
    const list = root.querySelector(selectors.entryList);
    const count = root.querySelector(selectors.entryCount);

    if (count) {
      count.textContent = String(pages.length);
    }

    if (!list) {
      return;
    }

    clearNode(list);

    if (!pages.length) {
      const empty = document.createElement("p");
      empty.className = "live-entry-empty";
      empty.textContent = "This notebook is waiting for its first public note.";
      list.append(empty);
      return;
    }

    pages.forEach((page, index) => {
      const button = document.createElement("button");
      button.className = "live-entry-button";
      button.type = "button";
      button.setAttribute("role", "listitem");
      button.dataset.entryIndex = String(index);
      if (index === currentIndex) {
        button.setAttribute("aria-current", "page");
      }
      button.addEventListener("click", () => {
        currentIndex = index;
        renderPage(root);
      });

      const date = document.createElement("span");
      date.className = "live-entry-date";
      date.textContent = formatDate(page.date);

      const title = document.createElement("strong");
      title.textContent = page.title || "Untitled Note";

      const meta = document.createElement("span");
      meta.className = "live-entry-meta";
      meta.textContent = page.project || "Notebook";

      button.append(date, title, meta);
      list.append(button);
    });
  };

  const syncEntrySelection = (root) => {
    root.querySelectorAll("[data-entry-index]").forEach((entry) => {
      if (Number(entry.dataset.entryIndex) === currentIndex) {
        entry.setAttribute("aria-current", "page");
      } else {
        entry.removeAttribute("aria-current");
      }
    });
  };

  const renderFallback = (root, message) => {
    pages = [];
    currentIndex = 0;
    setText(root, selectors.notebookTitle, "Live Notebook");
    setText(root, selectors.notebookSubtitle, "Published notes from Scriptorium.");
    setText(root, selectors.noteMeta, "SCRIPTORIUM · NOTEBOOK · TEMPORARILY QUIET");
    setText(root, selectors.noteTitle, "The notebook is closed for a moment.");
    setText(root, selectors.noteFoot, "Published from Scriptorium");
    setText(root, selectors.pageCount, "Page 0 of 0");
    setText(root, selectors.status, message || "Build activity will appear here soon.");
    setText(root, selectors.entryCount, "0");

    const body = root.querySelector(selectors.noteBody);
    if (body) {
      clearNode(body);
      const paragraph = document.createElement("p");
      paragraph.textContent = "The Live Notebook could not load its notes. Please try again shortly.";
      body.append(paragraph);
    }

    const tags = root.querySelector(selectors.noteTags);
    if (tags) {
      clearNode(tags);
    }

    const entries = root.querySelector(selectors.entryList);
    if (entries) {
      clearNode(entries);
      const empty = document.createElement("p");
      empty.className = "live-entry-empty";
      empty.textContent = "This notebook is waiting for its first public note.";
      entries.append(empty);
    }

    root.querySelector(selectors.previous)?.setAttribute("disabled", "");
    root.querySelector(selectors.next)?.setAttribute("disabled", "");
  };

  const renderPage = (root) => {
    const page = pages[currentIndex];
    if (!page) {
      renderFallback(root, "No published notes are available yet.");
      return;
    }

    setText(root, selectors.noteMeta, `${page.project || "Notebook"} · ${page.type || "Note"} · ${formatDate(page.date)}`);
    setText(root, selectors.noteTitle, page.title || "Untitled Note");
    setText(root, selectors.noteFoot, `Published from Scriptorium · ${page.id || "live-note"}`);
    setText(root, selectors.pageCount, `Page ${currentIndex + 1} of ${pages.length}`);
    setText(root, selectors.status, "");
    updateHash(page);
    syncEntrySelection(root);

    const body = root.querySelector(selectors.noteBody);
    if (body) {
      clearNode(body);
      (Array.isArray(page.body) ? page.body : []).forEach((line) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        body.append(paragraph);
      });
    }

    const tags = root.querySelector(selectors.noteTags);
    if (tags) {
      clearNode(tags);
      (Array.isArray(page.tags) ? page.tags : []).forEach((tag) => {
        const item = document.createElement("li");
        item.textContent = tag;
        tags.append(item);
      });
    }

    const previous = root.querySelector(selectors.previous);
    const next = root.querySelector(selectors.next);
    previous?.toggleAttribute("disabled", currentIndex === 0);
    next?.toggleAttribute("disabled", currentIndex === pages.length - 1);
  };

  const movePage = (offset) => {
    if (!initializedRoot || !pages.length) {
      return;
    }

    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= pages.length) {
      return;
    }

    currentIndex = nextIndex;
    renderPage(initializedRoot);
  };

  const bindControls = (root) => {
    root.querySelector(selectors.previous)?.addEventListener("click", () => movePage(-1));
    root.querySelector(selectors.next)?.addEventListener("click", () => movePage(1));
    root.querySelector(selectors.share)?.addEventListener("click", async () => {
      const page = pages[currentIndex];
      const url = page?.id
        ? `${window.location.origin}${window.location.pathname}#${encodeURIComponent(page.id)}`
        : window.location.href;

      try {
        await navigator.clipboard.writeText(url);
        setText(root, selectors.status, "Entry link copied.");
      } catch (error) {
        console.warn(error.message);
        setText(root, selectors.status, url);
      }
    });
    root.querySelector(selectors.print)?.addEventListener("click", () => {
      window.print();
    });
  };

  const bindKeyboard = () => {
    if (window.__liveNotebookKeyboardBound) {
      return;
    }

    window.__liveNotebookKeyboardBound = true;
    document.addEventListener("keydown", (event) => {
      if (!initializedRoot || !initializedRoot.isConnected) {
        return;
      }

      const tagName = event.target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePage(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePage(1);
      }
    });
  };

  const initNotebook = async () => {
    const root = document.querySelector(selectors.root);
    if (!root || root === initializedRoot) {
      return;
    }

    initializedRoot = root;
    bindControls(root);
    bindKeyboard();

    const source = root.dataset.notebookSource || defaultSource;
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Live Notebook unavailable: ${response.status}`);
      }

      const data = await response.json();
      pages = Array.isArray(data.pages) ? data.pages : [];
      currentIndex = Math.max(0, indexFromHash());
      setText(root, selectors.notebookTitle, data.notebook?.title || "Live Notebook");
      setText(root, selectors.notebookSubtitle, data.notebook?.subtitle || "Published notes from Scriptorium.");
      renderEntryList(root);
      renderPage(root);
    } catch (error) {
      console.warn(error.message);
      renderFallback(root, "The notebook data could not be loaded.");
    }
  };

  window.AngelSite = {
    ...(window.AngelSite || {}),
    initNotebook
  };

  document.addEventListener("DOMContentLoaded", initNotebook);
  window.addEventListener("angelsite:page-ready", initNotebook);
})();
