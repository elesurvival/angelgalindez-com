(function () {
  "use strict";

  const dataUrl = "/assets/data/build-log.json";
  const maxVisibleItems = 100;
  const projectAccent = {
    continuo: "cyan",
    echo: "purple",
    glimpse: "green",
    tempo: "green",
    "angelgalindez-com": "gold",
    "ele survival shopify": "green",
    "elesurvival-shopify": "green",
  };

  const projectLinks = {
    "angelgalindez.com": "index.html",
    "angelgalindez-com": "index.html",
    continuo: "continuo.html",
    echo: "echo.html",
    tempo: "tempo.html",
    "ele survival": "ele.html",
    "ele survival shopify": "ele.html",
    "ele shopify": "ele.html",
    "elesurvival-shopify": "ele.html",
    "quantum flux": "quantum-flux.html",
  };

  const normalizeProject = (value) => String(value || "")
    .trim()
    .toLowerCase();

  const getAccent = (item) => {
    const project = normalizeProject(item.project);
    const repo = normalizeProject(item.repo);
    return projectAccent[project] || projectAccent[repo] || "gold";
  };

  const getProjectHref = (item) => {
    const project = normalizeProject(item.project);
    const repo = normalizeProject(item.repo);
    return projectLinks[project] || projectLinks[repo] || "";
  };

  const formatUpdated = (value) => {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();

    if (!Number.isFinite(diff)) {
      return "Updated recently";
    }

    const minutes = Math.max(0, Math.round(diff / 60000));
    if (minutes < 1) {
      return "Updated just now";
    }
    if (minutes < 60) {
      return `Updated ${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.round(hours / 24);
    return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  };

  const makeProjectBadge = (item, className) => {
    const label = item.project || item.repo || "Build";
    const href = getProjectHref(item);
    const element = makeElement(href ? "a" : "span", className, label);

    if (href) {
      element.href = href;
      element.setAttribute("aria-label", `View ${label}`);
    }

    return element;
  };

  const renderFallback = (panel, message = "Build activity will appear here soon.") => {
    const list = panel.querySelector("[data-build-log-list]");
    const updated = panel.querySelector("[data-build-log-updated]");
    const projects = panel.querySelector("[data-build-log-projects]");

    if (list) {
      list.replaceChildren(makeElement("p", "build-log-fallback", message));
    }
    if (updated) {
      updated.innerHTML = '<span aria-hidden="true"></span>Updated soon';
    }
    if (projects) {
      projects.replaceChildren();
    }
  };

  const renderHomeTeasers = (data) => {
    document.querySelectorAll("[data-build-log-home-updated]").forEach((element) => {
      element.textContent = formatUpdated(data?.updated_at);
    });
  };

  const renderItems = (panel, data) => {
    const list = panel.querySelector("[data-build-log-list]");
    const updated = panel.querySelector("[data-build-log-updated]");
    const projects = panel.querySelector("[data-build-log-projects]");
    const items = Array.isArray(data.items) ? data.items.slice(0, maxVisibleItems) : [];

    if (!list || !items.length) {
      renderFallback(panel);
      return;
    }

    list.replaceChildren(...items.map((item) => {
      const row = makeElement("article", "build-log-row");
      const accent = getAccent(item);

      const badge = makeProjectBadge(item, `build-log-badge build-log-badge--${accent}`);
      const message = makeElement("p", "build-log-message", item.message || "Quiet progress");
      const meta = makeElement("p", "build-log-meta", `${item.date || ""}${item.time ? ` • ${item.time}` : ""}`.trim());
      const hash = makeElement("span", "build-log-hash", item.hash || "-------");

      row.append(badge, message, meta, hash);
      return row;
    }));

    if (updated) {
      updated.replaceChildren(makeElement("span"));
      updated.append(` ${formatUpdated(data.updated_at)}`);
    }

    if (projects) {
      const uniqueProjects = [...new Map(items.map((item) => [item.project || item.repo, item])).values()].slice(0, 4);
      projects.replaceChildren(...uniqueProjects.map((item) => (
        makeProjectBadge(item, `build-log-project build-log-project--${getAccent(item)}`)
      )));
    }
  };

  const initBuildLog = async () => {
    const panel = document.querySelector("[data-build-log-panel], .workshop-build-log");
    const homeTeasers = document.querySelectorAll("[data-build-log-home-updated]");

    if (!panel && !homeTeasers.length) {
      return;
    }

    try {
      const response = await fetch(dataUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Build log unavailable: ${response.status}`);
      }

      const data = await response.json();
      renderHomeTeasers(data);
      if (panel) {
        renderItems(panel, data);
      }
    } catch (error) {
      console.warn(error.message);
      if (panel) {
        renderFallback(panel);
      }
    }
  };

  window.AngelSite = {
    ...(window.AngelSite || {}),
    initBuildLog,
  };

  document.addEventListener("DOMContentLoaded", initBuildLog);
  window.addEventListener("angelsite:page-ready", initBuildLog);
})();
