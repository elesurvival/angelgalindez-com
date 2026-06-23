(function () {
  "use strict";

  const previews = {
    "voice-capture": {
      title: "Voice Capture",
      src: "/assets/projects/echo/voice-capture.png",
      alt: "Echo Voice Capture screenshot",
    },
    "manual-entry": {
      title: "Manual Entry",
      src: "/assets/projects/echo/manual-entry.png",
      alt: "Echo Manual Entry screenshot",
    },
    "auto-transcribe": {
      title: "Auto Transcribe",
      src: "/assets/projects/echo/auto-transcribe.png",
      alt: "Echo Auto Transcribe screenshot",
    },
    "syncs-to-continuo": {
      title: "Syncs to Continuo",
      src: "/assets/projects/echo/syncs-to-continuo.png",
      alt: "Echo Syncs to Continuo screenshot",
    },
  };

  let activeTrigger = null;

  const getModal = () => document.querySelector("[data-echo-modal-root]");

  const closeModal = () => {
    const modal = getModal();
    if (!modal || !modal.classList.contains("is-open")) {
      return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("echo-modal-open");

    if (activeTrigger && document.contains(activeTrigger)) {
      activeTrigger.focus({ preventScroll: true });
    }
    activeTrigger = null;
  };

  const openModal = (key, trigger) => {
    const modal = getModal();
    const preview = previews[key];
    if (!modal || !preview) {
      return;
    }

    const title = modal.querySelector("#echo-modal-title");
    const image = modal.querySelector("[data-echo-modal-image]");
    if (title) {
      title.textContent = preview.title;
    }
    if (image) {
      image.src = preview.src;
      image.alt = preview.alt;
    }

    activeTrigger = trigger;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("echo-modal-open");
    modal.querySelector("[data-echo-modal-close]")?.focus({ preventScroll: true });
  };

  const handleClick = (event) => {
    const trigger = event.target.closest?.("[data-echo-modal]");
    if (trigger) {
      event.preventDefault();
      openModal(trigger.dataset.echoModal, trigger);
      return;
    }

    if (event.target.closest?.("[data-echo-modal-close]")) {
      event.preventDefault();
      closeModal();
    }
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  if (!window.EchoModalController) {
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    window.EchoModalController = {
      close: closeModal,
      open: openModal,
    };
  }
})();
