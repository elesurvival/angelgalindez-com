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
    rightPage: ".live-notebook-page-right",
    pageCount: "[data-page-count]",
    previous: "[data-notebook-prev]",
    next: "[data-notebook-next]",
    share: "[data-share-entry]",
    print: "[data-print-entry]",
    status: "[data-notebook-status]",
  };

  const semanticPrefixes = new Set([
    "Question",
    "Discovery",
    "Decision",
    "Why it matters",
    "Breakthrough",
    "Margin note",
    "Spark",
    "Image note",
  ]);

  const formatDate = (value) => {
    const [year, month, day] = String(value || "")
      .slice(0, 10)
      .split("-")
      .map(Number);
    if (!year || !month || !day) {
      return "Undated";
    }

    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
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

  const parseSemanticLine = (line) => {
    const match = String(line || "").match(/^([^:\n]{2,32}):\s+([\s\S]+)$/);
    if (!match) {
      return null;
    }

    const label = match[1].trim();
    if (!semanticPrefixes.has(label)) {
      return null;
    }

    return {
      label,
      text: match[2].trim(),
    };
  };

  const renderBodyLine = (line) => {
    const semanticLine = parseSemanticLine(line);
    const paragraph = document.createElement("p");

    if (!semanticLine) {
      paragraph.textContent = line;
      return paragraph;
    }

    paragraph.className = "live-notebook-semantic-line";

    const label = document.createElement("span");
    label.className = "live-notebook-semantic-label";
    label.textContent = semanticLine.label;

    const text = document.createElement("span");
    text.className = "live-notebook-semantic-text";
    text.textContent = semanticLine.text;

    paragraph.append(label, document.createTextNode(" "), text);
    return paragraph;
  };

  const renderSpreadBlock = (block) => {
    if (typeof block === "string") {
      return renderBodyLine(block);
    }

    if (!block || typeof block !== "object") {
      const paragraph = document.createElement("p");
      paragraph.textContent = "";
      return paragraph;
    }

    if (block.kind === "semantic") {
      return renderBodyLine(`${block.label || "Note"}: ${block.text || ""}`);
    }

    if (block.kind === "quote") {
      const quote = document.createElement("blockquote");
      quote.className = "live-notebook-quote";
      const text = document.createElement("p");
      text.textContent = `“${String(block.text || "").replace(/^["“]|["”]$/g, "")}”`;
      quote.append(text);
      if (block.attribution) {
        const cite = document.createElement("cite");
        cite.textContent = `— ${block.attribution}`;
        quote.append(cite);
      }
      return quote;
    }

    if (block.kind === "list") {
      const section = document.createElement("section");
      section.className = "live-notebook-list-block";
      if (block.title) {
        const heading = document.createElement("h4");
        heading.textContent = block.title;
        section.append(heading);
      }
      const list = document.createElement(block.ordered ? "ol" : "ul");
      (Array.isArray(block.items) ? block.items : []).forEach((item) => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        list.append(listItem);
      });
      section.append(list);
      return section;
    }

    if (block.kind === "image-note") {
      return renderBodyLine(`Image note: ${block.text || ""}`);
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = block.text || "";
    return paragraph;
  };

  const renderSpreadBody = (container, blocks) => {
    clearNode(container);
    (Array.isArray(blocks) ? blocks : []).forEach((block) => {
      container.append(renderSpreadBlock(block));
    });
  };

  const getPageHash = () =>
    decodeURIComponent(window.location.hash.replace(/^#/, ""));

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
    setText(
      root,
      selectors.notebookSubtitle,
      "Published notes from Scriptorium.",
    );
    setText(
      root,
      selectors.noteMeta,
      "SCRIPTORIUM · NOTEBOOK · TEMPORARILY QUIET",
    );
    setText(root, selectors.noteTitle, "The notebook is closed for a moment.");
    setText(root, selectors.noteFoot, "Published from Scriptorium");
    setText(root, selectors.pageCount, "Page 0 of 0");
    setText(
      root,
      selectors.status,
      message || "Build activity will appear here soon.",
    );
    setText(root, selectors.entryCount, "0");

    const body = root.querySelector(selectors.noteBody);
    if (body) {
      clearNode(body);
      const paragraph = document.createElement("p");
      paragraph.textContent =
        "The Live Notebook could not load its notes. Please try again shortly.";
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

  const renderRightPage = (root, page) => {
    const rightPage = root.querySelector(selectors.rightPage);
    if (!rightPage) {
      return;
    }

    const rightSpread = page.spread?.right;
    const rightBlocks = Array.isArray(rightSpread?.body)
      ? rightSpread.body
      : [];
    clearNode(rightPage);

    if (rightBlocks.length) {
      const header = document.createElement("header");
      header.className = "spread-page-header spread-page-header--right";
      const headerText = document.createElement("span");
      headerText.textContent =
        rightSpread.meta?.[0] || "Published from Scriptorium";
      header.append(headerText);

      const body = document.createElement("div");
      body.className = "live-notebook-note-body live-notebook-note-body--right";
      renderSpreadBody(body, rightBlocks);

      const footer = document.createElement("p");
      footer.className = "live-notebook-note-foot";
      footer.textContent = "Published from Scriptorium";

      rightPage.append(header, body, footer);
      return;
    }

    const sideLabel = document.createElement("p");
    sideLabel.className = "live-notebook-side-label";
    sideLabel.textContent = "Published from the private Admin Notebook.";

    const title = document.createElement("h3");
    title.dataset.notebookTitle = "";
    title.textContent = "Live Notebook";

    const tags = document.createElement("ul");
    tags.className = "live-notebook-tags";
    tags.dataset.noteTags = "";
    tags.setAttribute("aria-label", "Current note tags");

    const card = document.createElement("div");
    card.className = "live-notebook-side-card";
    const cardLabel = document.createElement("span");
    cardLabel.textContent = "Source";
    const cardTitle = document.createElement("strong");
    cardTitle.textContent = "Scriptorium";
    const cardText = document.createElement("p");
    cardText.textContent = "Selected notes allowed to breathe in public.";
    card.append(cardLabel, cardTitle, cardText);

    rightPage.append(sideLabel, title, tags, card);
  };

  const renderPage = (root) => {
    const page = pages[currentIndex];
    if (!page) {
      renderFallback(root, "No published notes are available yet.");
      return;
    }

    setText(
      root,
      selectors.noteMeta,
      `${page.project || "Notebook"} · ${page.type || "Note"} · ${formatDate(page.date)}`,
    );
    setText(root, selectors.noteTitle, page.title || "Untitled Note");
    setText(
      root,
      selectors.noteFoot,
      `Published from Scriptorium · ${page.id || "live-note"}`,
    );
    setText(
      root,
      selectors.pageCount,
      `Page ${currentIndex + 1} of ${pages.length}`,
    );
    setText(root, selectors.status, "");
    updateHash(page);
    syncEntrySelection(root);

    const body = root.querySelector(selectors.noteBody);
    if (body) {
      const leftSpread = page.spread?.left;
      if (Array.isArray(leftSpread?.body) && leftSpread.body.length) {
        renderSpreadBody(body, leftSpread.body);
      } else {
        clearNode(body);
        (Array.isArray(page.body) ? page.body : []).forEach((line) => {
          body.append(renderBodyLine(line));
        });
      }
    }

    renderRightPage(root, page);

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
    root
      .querySelector(selectors.previous)
      ?.addEventListener("click", () => movePage(-1));
    root
      .querySelector(selectors.next)
      ?.addEventListener("click", () => movePage(1));
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
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      ) {
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
      setText(
        root,
        selectors.notebookTitle,
        data.notebook?.title || "Live Notebook",
      );
      setText(
        root,
        selectors.notebookSubtitle,
        data.notebook?.subtitle || "Published notes from Scriptorium.",
      );
      renderEntryList(root);
      renderPage(root);
    } catch (error) {
      console.warn(error.message);
      renderFallback(root, "The notebook data could not be loaded.");
    }
  };

  window.AngelSite = {
    ...(window.AngelSite || {}),
    initNotebook,
  };

  document.addEventListener("DOMContentLoaded", initNotebook);
  window.addEventListener("angelsite:page-ready", initNotebook);
})();
