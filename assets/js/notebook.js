(function () {
  "use strict";

  const defaultSource = "/assets/data/live-notebook.json";
  let initializedRoot = null;
  let entries = [];
  let currentEntryIndex = 0;
  let currentPagePairStart = 1;

  const selectors = {
    root: "[data-live-notebook]",
    entryList: "[data-entry-list]",
    entryCount: "[data-entry-count]",
    notebookTitle: "[data-notebook-title]",
    notebookSubtitle: "[data-notebook-subtitle]",
    leftPage: ".live-notebook-page-left",
    rightPage: ".live-notebook-page-right",
    pageCount: "[data-page-count]",
    previousEntry: "[data-entry-prev]",
    nextEntry: "[data-entry-next]",
    previousPage: "[data-page-prev]",
    nextPage: "[data-page-next]",
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

  const presentationThemes = new Set(["scriptorium-default", "code-keepers"]);
  const notebookSkins = new Set(["scriptorium-default", "aged-notebook"]);
  const publishTargets = new Set([
    "workshop-notebook",
    "code-keepers-notebook",
  ]);

  const normalizePresentationTheme = (value) =>
    presentationThemes.has(value) ? value : "scriptorium-default";

  const normalizeNotebookSkin = (value) =>
    notebookSkins.has(value) ? value : "scriptorium-default";

  const normalizePublishTarget = (value) =>
    publishTargets.has(value) ? value : "workshop-notebook";

  const normalizeImageSurface = (surface) => {
    const preset =
      surface?.preset === "drawn-on-page" || surface?.preset === "pasted-reference"
        ? surface.preset
        : "raw";
    const blendMode =
      surface?.blendMode === "darken" || surface?.blendMode === "normal"
        ? surface.blendMode
        : "multiply";
    const inkSrc =
      typeof surface?.inkSrc === "string" && surface.inkSrc.trim()
        ? surface.inkSrc.trim()
        : "";

    if (preset !== "drawn-on-page") {
      return {
        preset,
        inkStrength: 0,
        opacity: 1,
        blendMode,
        inkSrc: "",
      };
    }

    return {
      preset,
      inkStrength: clampNumber(surface?.inkStrength, 1, 0.6, 1.6),
      opacity: clampNumber(surface?.opacity, 0.9, 0.35, 1),
      blendMode,
      inkSrc,
    };
  };

  const resetAxisClasses = (node, prefix, values) => {
    if (!node) return;
    values.forEach((value) => node.classList.remove(`${prefix}-${value}`));
  };

  const applyEntryPresentation = (root, entry) => {
    const presentationTheme = normalizePresentationTheme(
      entry?.presentationTheme || root.dataset.defaultPresentationTheme,
    );
    const notebookSkin = normalizeNotebookSkin(
      entry?.notebookSkin || root.dataset.defaultNotebookSkin,
    );
    const publishTarget = normalizePublishTarget(
      entry?.publishTarget || root.dataset.defaultPublishTarget,
    );
    const spread = root.querySelector(".live-notebook-spread");

    [root, spread].forEach((node) => {
      resetAxisClasses(node, "notebook-theme", presentationThemes);
      resetAxisClasses(node, "notebook-skin", notebookSkins);
      resetAxisClasses(node, "notebook-target", publishTargets);
      node?.classList.add(
        `notebook-theme-${presentationTheme}`,
        `notebook-skin-${notebookSkin}`,
        `notebook-target-${publishTarget}`,
      );
      if (node) {
        node.dataset.presentationTheme = presentationTheme;
        node.dataset.notebookSkin = notebookSkin;
        node.dataset.publishTarget = publishTarget;
      }
    });
  };

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

  const renderNotebookBlock = (block) => {
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
      const semanticListType = block.ordered
        ? "numbered-list"
        : `${listType}-list`;
      section.className = `notebook-block live-notebook-list-block block-${semanticListType}`;
      section.dataset.blockType = semanticListType;
      const frameEnabled =
        block.frame === false || block.frame?.enabled === false
          ? "false"
          : "true";
      section.dataset.frame = frameEnabled;
      applyMaterial(section, block);
      if (block.title) {
        const heading = document.createElement("h3");
        heading.className = "notebook-block__heading";
        heading.textContent = block.title;
        section.append(heading);
      }
      const list = document.createElement(block.ordered ? "ol" : "ul");
      list.className = "notebook-list-block__items";
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

    if (block.kind === "image") {
      return renderImageBlock(block);
    }

    return renderParagraphBlock(block);
  };

  const imageZIndex = (placement) => {
    const zIndex = Number(placement?.zIndex ?? 1);
    if (zIndex <= 0) return 1;
    if (zIndex >= 2) return 3;
    return 2;
  };

  const applyImagePlacement = (figure, placement = {}) => {
    const width = Math.max(120, Math.min(Number(placement.width ?? 320), 620));
    figure.style.setProperty("--live-image-width", `${width}px`);
    figure.style.zIndex = String(imageZIndex(placement));

    if (placement.mode !== "free") {
      figure.style.maxWidth = `min(${width}px, 100%)`;
      return;
    }

    const x = Math.max(0, Math.min(Number(placement.x ?? 0), 900));
    const y = Math.max(0, Math.min(Number(placement.y ?? 0), 900));
    figure.style.left = `max(0px, min(${x}px, calc(100% - ${width}px - 0.9rem)))`;
    figure.style.top = `max(0px, min(${y}px, calc(100% - 8rem)))`;
    figure.style.width = `min(${width}px, calc(100% - 1.2rem))`;
  };

  const applyImageSurface = (figure, surface = {}) => {
    const normalized = normalizeImageSurface(surface);
    figure.dataset.imageSurface = normalized.preset;
    delete figure.dataset.imageInkPrepared;

    if (normalized.preset !== "drawn-on-page") return;

    figure.style.setProperty(
      "--live-image-surface-opacity",
      String(normalized.opacity),
    );
    figure.style.setProperty(
      "--live-image-surface-blend-mode",
      normalized.blendMode,
    );
    if (normalized.inkSrc) {
      figure.dataset.imageInkPrepared = "true";
      return;
    }

    figure.style.setProperty(
      "--live-image-surface-contrast",
      String(1 + normalized.inkStrength * 0.16),
    );
  };

  const renderImageBlock = (block) => {
    const figure = document.createElement("figure");
    const displayMode = block.displayMode || "full";
    const placement = block.placement || {};
    figure.className = `live-notebook-image-block live-notebook-image-block--${displayMode}`;
    figure.dataset.placementMode = placement.mode === "free" ? "free" : "flow";
    applyMaterial(figure, block);
    applyImagePlacement(figure, placement);
    const imageSurface = normalizeImageSurface(block.imageSurface);
    applyImageSurface(figure, imageSurface);

    const image = document.createElement("img");
    image.src =
      imageSurface.preset === "drawn-on-page" && imageSurface.inkSrc
        ? imageSurface.inkSrc
        : block.src || "";
    image.alt = block.alt || "";
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image);

    if (block.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = block.caption;
      figure.append(caption);
    }

    return figure;
  };

  const freeLayerForPage = (page) => {
    let layer = page.querySelector(":scope > .live-notebook-free-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className =
        "live-notebook-free-layer live-notebook-decoration-layer";
      layer.setAttribute("aria-hidden", "true");
      page.append(layer);
    }

    return layer;
  };

  const clearFreeLayerForPage = (page) => {
    const layer = page.querySelector(":scope > .live-notebook-free-layer");
    if (layer) {
      clearNode(layer);
    }
    return layer;
  };

  const renderNotebookBody = (pageElement, container, blocks) => {
    const freeLayer = freeLayerForPage(pageElement);
    clearNode(freeLayer);
    clearNode(container);
    (Array.isArray(blocks) ? blocks : []).forEach((block) => {
      const rendered = renderNotebookBlock(block);
      if (
        freeLayer &&
        block &&
        typeof block === "object" &&
        block.kind === "image" &&
        block.placement?.mode === "free"
      ) {
        freeLayer.append(rendered);
        return;
      }

      container.append(rendered);
    });
  };

  const clampNumber = (value, fallback, min, max) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  };

  const applyDecorationPlacement = (node, decoration = {}) => {
    const width = clampNumber(decoration.width, 80, 16, 520);
    const x = clampNumber(decoration.x, 0, 0, 900);
    const y = clampNumber(decoration.y, 0, 0, 900);
    const scale = clampNumber(decoration.scale, 1, 0.5, 2);
    const rotation = clampNumber(decoration.rotation, 0, -180, 180);
    const zIndex = clampNumber(decoration.zIndex, 5, 0, 20);
    const flipX = decoration.flipX ? -1 : 1;
    const flipY = decoration.flipY ? -1 : 1;

    node.style.left = `min(${x}px, calc(100% - ${width}px - 0.9rem))`;
    node.style.top = `min(${y}px, calc(100% - 4rem))`;
    node.style.transform = `rotate(${rotation}deg) scale(${flipX * scale}, ${
      flipY * scale
    })`;
    node.style.width = `min(${width}px, calc(100% - 1.2rem))`;
    node.style.zIndex = String(zIndex);
  };

  const renderDecoration = (decoration) => {
    const figure = document.createElement("figure");
    figure.className = "live-notebook-decoration";
    figure.dataset.decorationId = decoration.id || "";
    figure.dataset.decorationPage = decoration.page || "";
    if (decoration.collection)
      figure.dataset.collection = decoration.collection;
    if (decoration.category) figure.dataset.category = decoration.category;
    applyDecorationPlacement(figure, decoration);

    const image = document.createElement("img");
    image.className = "live-notebook-decoration-image";
    image.src = decoration.src || "";
    image.alt = decoration.name || "";
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image);

    return figure;
  };

  const renderDecorationsForNotebookPage = (pageElement, notebookPage) => {
    if (!pageElement) return;
    const decorations = Array.isArray(notebookPage?.decorations)
      ? notebookPage.decorations
      : [];
    if (!decorations.length) return;

    const layer = freeLayerForPage(pageElement);
    decorations.forEach((decoration) => {
      layer.append(renderDecoration(decoration));
    });
  };

  const humanizeTag = (tag) =>
    String(tag || "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const taxonomyTagLabels = (entry) => {
    const leftMeta = Array.isArray(entry.spread?.left?.meta)
      ? entry.spread.left.meta
      : [];
    const labels = leftMeta.filter(
      (item) =>
        item &&
        item !== entry.project &&
        item !== entry.type &&
        item !== entry.date &&
        item !== formatDate(entry.date),
    );

    if (labels.length) {
      return labels;
    }

    return Array.isArray(entry.tags) ? entry.tags.map(humanizeTag) : [];
  };

  const renderTaxonomyChips = (pageElement, entry) => {
    const title = pageElement.querySelector("h2");
    if (!title) {
      return;
    }

    const chips = [
      entry.project ? `Project: ${entry.project}` : "",
      entry.type && entry.type !== "Note" ? `Theme: ${entry.type}` : "",
      ...taxonomyTagLabels(entry),
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
    decodeURIComponent(window.location.hash.replace(/^#/, "").split("/")[0]);

  const indexFromHash = () => {
    const hash = getPageHash();
    if (!hash) {
      return -1;
    }

    return entries.findIndex((entry) => entry.id === hash);
  };

  const updateHash = (entry) => {
    if (!entry?.id || window.location.hash === `#${entry.id}`) {
      return;
    }

    window.history.replaceState(null, "", `#${encodeURIComponent(entry.id)}`);
  };

  const entryTitle = (entry) => entry?.title || "Untitled Note";

  const normalizePageRecord = (entry, record, fallbackNumber) => {
    const pageNumber = Math.max(
      1,
      Number(record?.pageNumber || fallbackNumber),
    );
    const side = pageNumber % 2 === 0 ? "right" : "left";
    return {
      pageNumber,
      side,
      title: record?.title ?? null,
      meta: Array.isArray(record?.meta) ? record.meta : [],
      body: Array.isArray(record?.body) ? record.body : [],
      decorations: Array.isArray(record?.decorations) ? record.decorations : [],
    };
  };

  const legacyEntryPages = (entry) => {
    const leftSpread = entry?.spread?.left;
    const rightSpread = entry?.spread?.right;
    const leftBody = Array.isArray(leftSpread?.body)
      ? leftSpread.body
      : Array.isArray(entry?.body)
        ? entry.body
        : [];
    const rightBody = Array.isArray(rightSpread?.body) ? rightSpread.body : [];
    const legacyDecorations = Array.isArray(entry?.decorations)
      ? entry.decorations
      : [];

    return [
      {
        pageNumber: 1,
        side: "left",
        title: entryTitle(entry),
        meta: Array.isArray(leftSpread?.meta) ? leftSpread.meta : [],
        body: leftBody,
        decorations: legacyDecorations.filter(
          (decoration) => decoration?.page !== "right",
        ),
      },
      {
        pageNumber: 2,
        side: "right",
        title: null,
        meta: Array.isArray(rightSpread?.meta) ? rightSpread.meta : [],
        body: rightBody,
        decorations: legacyDecorations.filter(
          (decoration) => decoration?.page === "right",
        ),
      },
    ];
  };

  const getEntryPages = (entry) => {
    if (Array.isArray(entry?.pages) && entry.pages.length) {
      return entry.pages
        .map((record, index) => normalizePageRecord(entry, record, index + 1))
        .sort((a, b) => a.pageNumber - b.pageNumber);
    }

    return legacyEntryPages(entry);
  };

  const pageByNumber = (entryPages, pageNumber) =>
    entryPages.find((page) => page.pageNumber === pageNumber) || null;

  const getVisiblePagePair = (entry, pagePairStart) => {
    const normalizedStart = Math.max(
      1,
      Number(pagePairStart) % 2 === 0
        ? Number(pagePairStart) - 1
        : Number(pagePairStart),
    );
    const entryPages = getEntryPages(entry);
    return {
      entryPages,
      left: pageByNumber(entryPages, normalizedStart),
      right: pageByNumber(entryPages, normalizedStart + 1),
      start: normalizedStart,
      totalPages: Math.max(1, ...entryPages.map((page) => page.pageNumber)),
    };
  };

  const hasPreviousPagePair = (pagePairStart) => pagePairStart > 1;

  const hasNextPagePair = (entry, pagePairStart) => {
    const { totalPages } = getVisiblePagePair(entry, pagePairStart);
    return pagePairStart + 2 <= totalPages;
  };

  const pageStatusText = (entry, pagePairStart) => {
    const { left, right, start, totalPages } = getVisiblePagePair(
      entry,
      pagePairStart,
    );
    const visible = [left, right].filter(Boolean);
    if (!visible.length) {
      return "Page 0 of 0";
    }

    const first = visible[0].pageNumber;
    const last = visible[visible.length - 1].pageNumber;

    if (first === last || start === totalPages) {
      return `Page ${first} of ${totalPages}`;
    }

    return `Pages ${first}-${last} of ${totalPages}`;
  };

  const renderEntryList = (root) => {
    const list = root.querySelector(selectors.entryList);
    const count = root.querySelector(selectors.entryCount);

    if (count) {
      count.textContent = String(entries.length);
    }

    if (!list) {
      return;
    }

    clearNode(list);

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "live-entry-empty";
      empty.textContent = "This notebook is waiting for its first public note.";
      list.append(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const button = document.createElement("button");
      button.className = "live-entry-button";
      button.type = "button";
      button.setAttribute("role", "listitem");
      button.dataset.entryIndex = String(index);
      if (index === currentEntryIndex) {
        button.setAttribute("aria-current", "page");
      }
      button.addEventListener("click", () => {
        currentEntryIndex = index;
        currentPagePairStart = 1;
        renderEntry(root);
      });

      const date = document.createElement("span");
      date.className = "live-entry-date";
      date.textContent = formatDate(entry.date);

      const title = document.createElement("strong");
      title.textContent = entryTitle(entry);

      const meta = document.createElement("span");
      meta.className = "live-entry-meta";
      meta.textContent = entry.project || "Notebook";

      button.append(date, title, meta);
      list.append(button);
    });
  };

  const syncEntrySelection = (root) => {
    root.querySelectorAll("[data-entry-index]").forEach((entry) => {
      if (Number(entry.dataset.entryIndex) === currentEntryIndex) {
        entry.setAttribute("aria-current", "page");
      } else {
        entry.removeAttribute("aria-current");
      }
    });
  };

  const renderFallback = (root, message) => {
    entries = [];
    currentEntryIndex = 0;
    currentPagePairStart = 1;
    applyEntryPresentation(root, null);
    setText(root, selectors.notebookTitle, "Live Notebook");
    setText(
      root,
      selectors.notebookSubtitle,
      displayNotebookSubtitle("Selected notebook notes."),
    );
    setText(root, selectors.pageCount, "Page 0 of 0");
    setText(
      root,
      selectors.status,
      message || "Build activity will appear here soon.",
    );
    setText(root, selectors.entryCount, "0");

    const leftPage = root.querySelector(selectors.leftPage);
    const rightPage = root.querySelector(selectors.rightPage);
    if (leftPage) {
      clearNode(leftPage);
      clearFreeLayerForPage(leftPage);
      const meta = document.createElement("p");
      meta.className = "live-notebook-note-meta";
      meta.textContent = "SCRIPTORIUM · NOTEBOOK · TEMPORARILY QUIET";
      const title = document.createElement("h2");
      title.textContent = "The notebook is closed for a moment.";
      const body = document.createElement("div");
      body.className = "live-notebook-note-body";
      const paragraph = document.createElement("p");
      paragraph.textContent =
        "The Live Notebook could not load its notes. Please try again shortly.";
      body.append(paragraph);
      leftPage.append(meta, title, body);
    }

    if (rightPage) {
      renderBlankNotebookPage(rightPage, "right");
    }

    const entryList = root.querySelector(selectors.entryList);
    if (entryList) {
      clearNode(entryList);
      const empty = document.createElement("p");
      empty.className = "live-entry-empty";
      empty.textContent = "This notebook is waiting for its first public note.";
      entryList.append(empty);
    }

    root.querySelector(selectors.previousEntry)?.setAttribute("disabled", "");
    root.querySelector(selectors.nextEntry)?.setAttribute("disabled", "");
    root.querySelector(selectors.previousPage)?.setAttribute("disabled", "");
    root.querySelector(selectors.nextPage)?.setAttribute("disabled", "");
  };

  const renderBlankNotebookPage = (pageElement, side) => {
    clearNode(pageElement);
    clearFreeLayerForPage(pageElement);
    pageElement.classList.add("live-notebook-blank-page");
    pageElement.dataset.visiblePage = "";
    pageElement.setAttribute(
      "aria-label",
      side === "left"
        ? "Blank left notebook page"
        : "Blank right notebook page",
    );
  };

  const renderNotebookPage = (pageElement, notebookPage, entry, side) => {
    if (!pageElement) return;
    if (!notebookPage) {
      renderBlankNotebookPage(pageElement, side);
      return;
    }

    clearNode(pageElement);
    clearFreeLayerForPage(pageElement);
    pageElement.classList.remove("live-notebook-blank-page");
    pageElement.dataset.visiblePage = String(notebookPage.pageNumber);
    pageElement.setAttribute(
      "aria-label",
      `${side === "left" ? "Left" : "Right"} notebook page ${notebookPage.pageNumber}`,
    );

    if (notebookPage.pageNumber === 1) {
      const meta = document.createElement("p");
      meta.className = "live-notebook-note-meta";
      meta.textContent = formatDate(entry.date);
      pageElement.append(meta);
    } else if (Array.isArray(notebookPage.meta) && notebookPage.meta.length) {
      const meta = document.createElement("p");
      meta.className = "live-notebook-note-meta";
      meta.textContent = notebookPage.meta.join(" · ");
      pageElement.append(meta);
    }

    if (notebookPage.title) {
      const title = document.createElement("h2");
      title.textContent = notebookPage.title;
      pageElement.append(title);
      if (notebookPage.pageNumber === 1) {
        renderTaxonomyChips(pageElement, entry);
      }
    }

    const body = document.createElement("div");
    body.className = `live-notebook-note-body${
      side === "right" ? " live-notebook-note-body--right" : ""
    }`;
    renderNotebookBody(pageElement, body, notebookPage.body);
    pageElement.append(body);
    renderDecorationsForNotebookPage(pageElement, notebookPage);
  };

  const renderEntry = (root) => {
    const entry = entries[currentEntryIndex];
    if (!entry) {
      renderFallback(root, "No published notes are available yet.");
      return;
    }
    applyEntryPresentation(root, entry);

    const { left, right, totalPages } = getVisiblePagePair(
      entry,
      currentPagePairStart,
    );
    if (currentPagePairStart > totalPages) {
      currentPagePairStart = Math.max(
        1,
        totalPages % 2 === 0 ? totalPages - 1 : totalPages,
      );
    }

    setText(
      root,
      selectors.pageCount,
      pageStatusText(entry, currentPagePairStart),
    );
    setText(root, selectors.status, "");
    updateHash(entry);
    syncEntrySelection(root);

    renderNotebookPage(
      root.querySelector(selectors.leftPage),
      left,
      entry,
      "left",
    );
    renderNotebookPage(
      root.querySelector(selectors.rightPage),
      right,
      entry,
      "right",
    );

    const previousEntry = root.querySelector(selectors.previousEntry);
    const nextEntry = root.querySelector(selectors.nextEntry);
    const previousPage = root.querySelector(selectors.previousPage);
    const nextPage = root.querySelector(selectors.nextPage);
    previousEntry?.toggleAttribute("disabled", currentEntryIndex === 0);
    nextEntry?.toggleAttribute(
      "disabled",
      currentEntryIndex === entries.length - 1,
    );
    previousPage?.toggleAttribute(
      "disabled",
      !hasPreviousPagePair(currentPagePairStart),
    );
    nextPage?.toggleAttribute(
      "disabled",
      !hasNextPagePair(entry, currentPagePairStart),
    );
  };

  const moveEntry = (offset) => {
    if (!initializedRoot || !entries.length) {
      return;
    }

    const nextIndex = currentEntryIndex + offset;
    if (nextIndex < 0 || nextIndex >= entries.length) {
      return;
    }

    currentEntryIndex = nextIndex;
    currentPagePairStart = 1;
    renderEntry(initializedRoot);
  };

  const turnPage = (offset) => {
    if (!initializedRoot || !entries.length) {
      return;
    }

    const entry = entries[currentEntryIndex];
    const nextStart = currentPagePairStart + offset * 2;
    if (
      nextStart < 1 ||
      nextStart > getVisiblePagePair(entry, currentPagePairStart).totalPages
    ) {
      return;
    }

    currentPagePairStart = nextStart;
    renderEntry(initializedRoot);
  };

  const bindControls = (root) => {
    root
      .querySelector(selectors.previousEntry)
      ?.addEventListener("click", () => moveEntry(-1));
    root
      .querySelector(selectors.nextEntry)
      ?.addEventListener("click", () => moveEntry(1));
    root
      .querySelector(selectors.previousPage)
      ?.addEventListener("click", () => turnPage(-1));
    root
      .querySelector(selectors.nextPage)
      ?.addEventListener("click", () => turnPage(1));
    root.querySelector(selectors.share)?.addEventListener("click", async () => {
      const entry = entries[currentEntryIndex];
      const url = entry?.id
        ? `${window.location.origin}${window.location.pathname}#${encodeURIComponent(entry.id)}`
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
        moveEntry(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveEntry(1);
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
      entries = Array.isArray(data.pages) ? data.pages : [];
      currentEntryIndex = Math.max(0, indexFromHash());
      currentPagePairStart = 1;
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
      renderEntry(root);
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
