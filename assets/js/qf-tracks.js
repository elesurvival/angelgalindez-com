(function () {
  "use strict";

  window.QF_TRACKS = [
    { title: "System Boot", file: "/assets/projects/quantum-flux/audio/01-system-boot.mp3" },
    { title: "Code Breaker", file: "/assets/projects/quantum-flux/audio/02-code-breaker.mp3" },
    { title: "Digital Shadows", file: "/assets/projects/quantum-flux/audio/03-digital-shadows.mp3" },
    { title: "Zero-Day Dance", file: "/assets/projects/quantum-flux/audio/04-zero-day-dance.mp3" },
    { title: "Echoes of Rebellion", file: "/assets/projects/quantum-flux/audio/05-echoes-of-rebellion.mp3" },
    { title: "Packets in the Flow", file: "/assets/projects/quantum-flux/audio/06-packets-in-the-flow.mp3" },
    { title: "Liminal Dreams", file: "/assets/projects/quantum-flux/audio/07-liminal-dreams.mp3" },
    { title: "Binary Beats", file: "/assets/projects/quantum-flux/audio/08-binary-beats.mp3" },
    { title: "Quantum Leap", file: "/assets/projects/quantum-flux/audio/09-quantum-leap.mp3" },
    { title: "Upload My Soul", file: "/assets/projects/quantum-flux/audio/10-upload-my-soul.mp3" },
    { title: "Cybernetic Serenade", file: "/assets/projects/quantum-flux/audio/11-cybernetic-serenade.mp3" },
    { title: "Neon Algorithm", file: "/assets/projects/quantum-flux/audio/12-neon-algorithm.mp3" },
    { title: "Root Access Rhapsody", file: "/assets/projects/quantum-flux/audio/13-root-access-rhapsody.mp3" },
    { title: "The Last Key", file: "/assets/projects/quantum-flux/audio/14-the-last-key.mp3" },
    { title: "Phantom Protocols", file: "/assets/projects/quantum-flux/audio/15-phantom-protocols.mp3" },
    { title: "Debugging the Night", file: "/assets/projects/quantum-flux/audio/16-debugging-the-night.mp3" },
    { title: "Shadow Hackers", file: "/assets/projects/quantum-flux/audio/17-shadow-hackers.mp3" },
    { title: "Hacktivist Anthem", file: "/assets/projects/quantum-flux/audio/18-hacktivist-anthem.mp3" },
    { title: "End of the Code", file: "/assets/projects/quantum-flux/audio/19-end-of-the-code.mp3" },
    { title: "Log Off Sequence", file: "/assets/projects/quantum-flux/audio/20-log-off-sequence.mp3" }
  ].map((track, index) => ({
    ...track,
    index,
    number: String(index + 1).padStart(2, "0"),
    artist: "Quantum Flux",
    album: "Ciphered Realms"
  }));
})();
