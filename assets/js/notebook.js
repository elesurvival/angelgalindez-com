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

  const displayNotebookSubtitle = (value) =>
    String(value || "").trim() === "Published notes from Scriptorium."
      ? "Ideas, discoveries, wrong turns, and breakthroughs. A notebook of the philosophy behind every commit."
      : value;

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

  const semanticClassName = (label) =>
    String(label || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const semanticHeading = (label) => {
    const headings = {
      Spark: "The Spark",
      Question: "The Question",
      Discovery: "The Discovery",
      Decision: "The Decision",
      "Why it matters": "Why It Matters",
      Breakthrough: "The Breakthrough",
      "Margin note": "Margin Note",
      "Image note": "Image Note",
    };

    return headings[label] || label || "Note";
  };

  const materialClassNames = (block) => {
    const id = block?.material?.id || block?.materialId;
    const materials = {
      "artifact-card":
        "material material--artifact-card paper-fragment paper-fragment--photo paper-fragment--artifact paper-fragment--taped",
      "highlight-wash":
        "material material--highlight-wash paper-fragment--highlight",
      "kraft-note":
        "material material--kraft-note paper-fragment paper-fragment--kraft",
      "margin-scribble":
        "material material--margin-scribble paper-fragment--annotation paper-fragment--handwritten",
      "pencil-box":
        "material material--pencil-box paper-fragment--boxed paper-fragment--pencil",
      "quiet-divider":
        "material material--quiet-divider paper-fragment--divider",
      "quote-slip":
        "material material--quote-slip paper-fragment paper-fragment--excerpt",
      "taped-fragment":
        "material material--taped-fragment paper-fragment paper-fragment--torn paper-fragment--taped",
    };

    return typeof id === "string" && materials[id] ? materials[id] : "";
  };

  const applyMaterial = (node, block) => {
    const classNames = materialClassNames(block);
    if (!classNames) {
      return;
    }

    node.classList.add("notebook-block");
    classNames.split(/\s+/).forEach((className) => {
      if (className) node.classList.add(className);
    });
    if (block?.material?.id || block?.materialId) {
      node.dataset.material = block.material?.id || block.materialId;
    }
  };

  const renderSemanticBlock = (semanticLine) => {
    const section = document.createElement("section");
    section.className = `live-notebook-semantic-line live-notebook-semantic-line--${semanticClassName(
      semanticLine.label,
    )}`;
    applyMaterial(section, semanticLine);

    const label = document.createElement("h3");
    label.className = "live-notebook-semantic-label";
    label.textContent = semanticHeading(semanticLine.label);

    const text = document.createElement("p");
    text.className = "live-notebook-semantic-text";
    text.textContent = semanticLine.text;

    section.append(label, text);
    return section;
  };

  const renderParagraphBlock = (block) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = block?.text || "";
    applyMaterial(paragraph, block);
    return paragraph;
  };

  const renderBodyLine = (line) => {
    const semanticLine = parseSemanticLine(line);
    const paragraph = document.createElement("p");

    if (!semanticLine) {
      paragraph.textContent = line;
      return paragraph;
    }

    return renderSemanticBlock(semanticLine);
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
      return renderSemanticBlock({
        label: block.label || "Note",
        text: block.text || "",
        material: block.material,
      });
    }

    if (block.kind === "quote") {
      const quote = document.createElement("blockquote");
      quote.className = "live-notebook-quote";
      applyMaterial(quote, block);
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
      const listType =
        block.listType || (block.ordered ? "numbered" : "bulleted");
      section.className = `live-notebook-list-block block-${listType}-list`;
      section.dataset.frame = block.frame === false ? "false" : "true";
      applyMaterial(section, block);
      if (block.title) {
        const heading = document.createElement("h4");
        heading.className = "notebook-block__heading";
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
      return renderSemanticBlock({
        label: "Image note",
        text: block.text || "",
        material: block.material,
      });
    }

    return renderParagraphBlock(block);
  };

  const renderSpreadBody = (container, blocks) => {
    clearNode(container);
    (Array.isArray(blocks) ? blocks : []).forEach((block) => {
      container.append(renderSpreadBlock(block));
    });
  };

  const humanizeTag = (tag) =>
    String(tag || "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const taxonomyTagLabels = (page) => {
    const leftMeta = Array.isArray(page.spread?.left?.meta)
      ? page.spread.left.meta
      : [];
    const labels = leftMeta.filter(
      (item) =>
        item &&
        item !== page.project &&
        item !== page.type &&
        item !== page.date &&
        item !== formatDate(page.date),
    );

    if (labels.length) {
      return labels;
    }

    return Array.isArray(page.tags) ? page.tags.map(humanizeTag) : [];
  };

  const clearTaxonomyChips = (root) => {
    root
      .querySelectorAll(".live-notebook-taxonomy")
      .forEach((node) => node.remove());
  };

  const renderTaxonomyChips = (root, page) => {
    const title = root.querySelector(selectors.noteTitle);
    if (!title) {
      return;
    }

    clearTaxonomyChips(root);

    const chips = [
      page.project ? `Project: ${page.project}` : "",
      page.type && page.type !== "Note" ? `Theme: ${page.type}` : "",
      ...taxonomyTagLabels(page),
    ].filter(Boolean);

    if (!chips.length) {
      return;
    }

    const list = document.createElement("ul");
    list.className = "live-notebook-taxonomy";
    list.setAttribute("aria-label", "Notebook entry taxonomy");
    chips.forEach((chip) => {
      const item = document.createElement("li");
      item.textContent = chip;
      list.append(item);
    });

    title.insertAdjacentElement("afterend", list);
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
      displayNotebookSubtitle("Selected notebook notes."),
    );
    setText(
      root,
      selectors.noteMeta,
      "SCRIPTORIUM · NOTEBOOK · TEMPORARILY QUIET",
    );
    setText(root, selectors.noteTitle, "The notebook is closed for a moment.");
    setText(root, selectors.pageCount, "Page 0 of 0");
    setText(
      root,
      selectors.status,
      message || "Build activity will appear here soon.",
    );
    setText(root, selectors.entryCount, "0");
    clearTaxonomyChips(root);

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
      const body = document.createElement("div");
      body.className = "live-notebook-note-body live-notebook-note-body--right";
      renderSpreadBody(body, rightBlocks);

      rightPage.append(body);
      return;
    }

    const sideLabel = document.createElement("p");
    sideLabel.className = "live-notebook-side-label";
    sideLabel.textContent = "Notebook details";

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

    setText(root, selectors.noteMeta, formatDate(page.date));
    setText(root, selectors.noteTitle, page.title || "Untitled Note");
    renderTaxonomyChips(root, page);
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
        displayNotebookSubtitle(
          data.notebook?.subtitle || "Selected notebook notes.",
        ),
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
