(function () {
  "use strict";

  const contentSelector = "#site-content";
  const activeClass = "is-active";
  const transitionClass = "is-soft-navigating";
  const projectRoutes = ["/continuo.html", "/echo.html", "/ele.html", "/quantum-flux.html"];
  let isNavigating = false;

  const normalizePath = (url) => {
    if (url.pathname === "/") {
      return "/index.html";
    }
    return url.pathname;
  };

  const isHtmlRoute = (url) => {
    const path = normalizePath(url);
    return path.endsWith("/") || path.endsWith(".html");
  };

  const shouldIntercept = (event, link) => {
    if (event.defaultPrevented || event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }

    const targetUrl = new URL(link.href, window.location.href);
    if (targetUrl.origin !== window.location.origin || !isHtmlRoute(targetUrl)) {
      return false;
    }
    if (targetUrl.pathname === window.location.pathname && targetUrl.hash) {
      return false;
    }

    return true;
  };

  const shouldHandleSamePageHash = (event, link) => {
    if (event.defaultPrevented || event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href === "#" || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }

    const targetUrl = new URL(link.href, window.location.href);
    return targetUrl.origin === window.location.origin
      && targetUrl.pathname === window.location.pathname
      && targetUrl.hash
      && targetUrl.hash.length > 1;
  };

  const makeAssetUrlsAbsolute = (root, baseUrl) => {
    root.querySelectorAll("[src]").forEach((element) => {
      const value = element.getAttribute("src");
      if (!value || value.startsWith("#") || value.startsWith("data:")) {
        return;
      }
      element.setAttribute("src", new URL(value, baseUrl).href);
    });

    root.querySelectorAll("[srcset]").forEach((element) => {
      const value = element.getAttribute("srcset");
      if (!value) {
        return;
      }
      const nextValue = value
        .split(",")
        .map((part) => {
          const [asset, descriptor] = part.trim().split(/\s+/, 2);
          if (!asset || asset.startsWith("data:")) {
            return part.trim();
          }
          return [new URL(asset, baseUrl).href, descriptor].filter(Boolean).join(" ");
        })
        .join(", ");
      element.setAttribute("srcset", nextValue);
    });
  };

  const markCurrentNavigation = (url) => {
    const targetPath = normalizePath(url);
    const sectionPath = targetPath.startsWith("/workshop/") ? "/workshop.html" : targetPath;
    const navLinks = Array.from(document.querySelectorAll(".site-header nav a"));
    const hasExactProjectLink = projectRoutes.includes(targetPath)
      && navLinks.some((link) => normalizePath(new URL(link.getAttribute("href"), window.location.href)) === targetPath);

    navLinks.forEach((link) => {
      const linkUrl = new URL(link.getAttribute("href"), window.location.href);
      const linkPath = normalizePath(linkUrl);
      let isActive = linkPath === sectionPath;

      if (!isActive && projectRoutes.includes(targetPath) && !hasExactProjectLink) {
        isActive = linkPath === "/projects.html";
      }

      link.classList.toggle(activeClass, isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const initEmailLinks = () => {
    document.querySelectorAll(".js-email-link").forEach((link) => {
      const user = link.dataset.emailUser || "";
      const domain = link.dataset.emailDomain || "";
      const tld = link.dataset.emailTld || "";
      if (!user || !domain || !tld) {
        return;
      }

      const address = `${user}@${domain}.${tld}`;
      link.href = `mailto:${address}`;
      if (link.dataset.emailLabel === "address") {
        link.textContent = address;
      }
    });
  };

  const initPage = () => {
    initEmailLinks();
    window.QFPlayer?.bindPage?.();
    window.dispatchEvent(new CustomEvent("angelsite:page-ready", {
      detail: {
        path: window.location.pathname,
        title: document.title
      }
    }));
  };

  const scrollToHashTarget = (url) => {
    if (!url.hash || url.hash.length <= 1) {
      return false;
    }

    const targetId = decodeURIComponent(url.hash.slice(1));
    const target = document.getElementById(targetId);
    if (!target) {
      return false;
    }

    target.scrollIntoView({ block: "start" });
    return true;
  };

  const scrollAfterNavigation = (url, options = {}) => {
    window.requestAnimationFrame(() => {
      if (options.popstate) {
        const scrollX = Number(options.state?.scrollX || 0);
        const scrollY = Number(options.state?.scrollY || 0);
        window.scrollTo(scrollX, scrollY);
        return;
      }

      if (!scrollToHashTarget(url)) {
        window.scrollTo(0, 0);
      }
    });
  };

  const rememberScrollPosition = () => {
    history.replaceState({
      ...(history.state || {}),
      scrollX: window.scrollX,
      scrollY: window.scrollY
    }, "", window.location.href);
  };

  const swapPage = async (url, options = {}) => {
    if (isNavigating) {
      return;
    }

    const currentMain = document.querySelector(contentSelector);
    if (!currentMain) {
      window.location.href = url.href;
      return;
    }

    isNavigating = true;
    document.documentElement.classList.add(transitionClass);

    try {
      rememberScrollPosition();

      const response = await fetch(url.href, {
        headers: {
          "X-Requested-With": "AngelSiteRouter"
        }
      });

      if (!response.ok) {
        throw new Error(`Navigation failed: ${response.status}`);
      }

      const html = await response.text();
      const nextDocument = new DOMParser().parseFromString(html, "text/html");
      const nextMain = nextDocument.querySelector(contentSelector) || nextDocument.querySelector("main");

      if (!nextMain) {
        throw new Error("Target page does not contain a main content area.");
      }

      nextMain.id = "site-content";
      makeAssetUrlsAbsolute(nextMain, url.href);
      currentMain.replaceWith(nextMain);

      document.title = nextDocument.title;
      document.body.className = nextDocument.body.className;
      markCurrentNavigation(url);

      if (!options.popstate) {
        history.pushState({ scrollX: 0, scrollY: 0 }, "", url.href);
      }

      initPage();
      scrollAfterNavigation(url, options);
    } catch (error) {
      console.warn("Soft navigation fell back to a full page load.", error);
      window.location.href = url.href;
    } finally {
      isNavigating = false;
      document.documentElement.classList.remove(transitionClass);
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a");

    if (shouldHandleSamePageHash(event, link)) {
      const url = new URL(link.href, window.location.href);
      event.preventDefault();
      rememberScrollPosition();
      history.pushState({ scrollX: 0, scrollY: 0 }, "", url.href);
      scrollAfterNavigation(url);
      return;
    }

    if (!shouldIntercept(event, link)) {
      return;
    }

    event.preventDefault();
    swapPage(new URL(link.href, window.location.href));
  });

  window.addEventListener("popstate", (event) => {
    swapPage(new URL(window.location.href), {
      popstate: true,
      state: event.state || {}
    });
  });

  window.AngelSite = {
    ...(window.AngelSite || {}),
    initPage,
    navigate: (href) => swapPage(new URL(href, window.location.href))
  };

  if (!history.state) {
    history.replaceState({ scrollX: window.scrollX, scrollY: window.scrollY }, "", window.location.href);
  }

  markCurrentNavigation(new URL(window.location.href));
  initPage();
  scrollAfterNavigation(new URL(window.location.href));
})();
