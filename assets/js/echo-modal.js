(function () {
  "use strict";

  const previewSteps = [
    {
      key: "voice-capture",
      title: "Voice Capture",
      description: "Capture thoughts the moment they happen. Echo records temporary audio so the idea can move into Continuo before it disappears.",
      src: "/assets/projects/echo/voice-capture.png",
      alt: "Echo Voice Capture screenshot",
    },
    {
      key: "auto-transcribe",
      title: "Auto Transcribe",
      description: "Echo sends temporary audio to Continuo for transcription, then returns editable text. Echo keeps no audio history.",
      src: "/assets/projects/echo/auto-transcribe.png",
      alt: "Echo Auto Transcribe screenshot",
    },
    {
      key: "manual-entry",
      title: "Manual Entry",
      description: "Review, edit, and refine the capture before sending it forward. This keeps the thought accurate before it enters the larger system.",
      src: "/assets/projects/echo/manual-entry.png",
      alt: "Echo Manual Entry screenshot",
    },
    {
      key: "syncs-to-continuo",
      title: "Syncs to Continuo",
      description: "The finalized capture is sent directly into Echo intake inside Continuo, ready to be organized, connected, and developed.",
      src: "/assets/projects/echo/syncs-to-continuo.png",
      alt: "Echo Syncs to Continuo screenshot",
    },
  ];
  const previews = Object.fromEntries(previewSteps.map((step, index) => [step.key, { ...step, index }]));

  let activeTrigger = null;
  let activeKey = previewSteps[0].key;

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

  const renderPreview = (key) => {
    const modal = getModal();
    const preview = previews[key];
    if (!modal || !preview) {
      return false;
    }

    const title = modal.querySelector("#echo-modal-title");
    const description = modal.querySelector("[data-echo-modal-description]");
    const image = modal.querySelector("[data-echo-modal-image]");
    if (title) {
      title.textContent = preview.title;
    }
    if (description) {
      description.textContent = preview.description;
    }
    if (image) {
      image.src = preview.src;
      image.alt = preview.alt;
    }

    activeKey = key;
    return true;
  };

  const openModal = (key, trigger) => {
    const modal = getModal();
    if (!modal || !renderPreview(key)) {
      return;
    }

    activeTrigger = trigger;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("echo-modal-open");
    modal.querySelector("[data-echo-modal-close]")?.focus({ preventScroll: true });
  };

  const stepPreview = (direction) => {
    const modal = getModal();
    if (!modal || !modal.classList.contains("is-open")) {
      return;
    }

    const currentIndex = previews[activeKey]?.index ?? 0;
    const nextIndex = (currentIndex + direction + previewSteps.length) % previewSteps.length;
    renderPreview(previewSteps[nextIndex].key);
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
      return;
    }

    if (event.target.closest?.("[data-echo-modal-prev]")) {
      event.preventDefault();
      stepPreview(-1);
      return;
    }

    if (event.target.closest?.("[data-echo-modal-next]")) {
      event.preventDefault();
      stepPreview(1);
    }
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") {
      closeModal();
      return;
    }

    const modal = getModal();
    if (!modal || !modal.classList.contains("is-open")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepPreview(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepPreview(1);
    }
  };

  if (!window.EchoModalController) {
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    window.EchoModalController = {
      close: closeModal,
      open: openModal,
      next: () => stepPreview(1),
      previous: () => stepPreview(-1),
    };
  }
})();
