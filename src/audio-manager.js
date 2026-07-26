const AUDIO_ASSETS = {
  village: "/assets/audio/village-ambience.wav",
  birds: "/assets/audio/birds.wav",
  hoof: "/assets/audio/bull-hoof.wav",
  bell: "/assets/audio/bull-bell.wav",
  cart: "/assets/audio/cart-wheels.wav",
  creak: "/assets/audio/cart-creak.wav",
};

const VOLUMES = {
  master: 1,
  village: 0.2,
  birds: 0.15,
  hoof: 0.45,
  bell: 0.35,
  cart: 0.3,
  creak: 0.22,
};

function safeSessionValue(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export class AudioManager {
  constructor(button) {
    this.button = button;
    this.context = null;
    this.masterGain = null;
    this.unlocked = false;
    this.started = false;
    this.loadingStarted = false;
    this.muted = safeSessionValue("bailgadi-muted") === "true";
    this.buffers = new Map();
    this.failed = new Set();
    this.loops = new Map();
    this.loopVolumes = new Map([
      ["village", VOLUMES.village],
      ["birds", VOLUMES.birds],
      ["cart", 0],
    ]);
    this.distanceToBell = 7;
    this.distanceToCreak = 10;
    this.events = { footsteps: 0, bells: 0, creaks: 0 };

    this.button.addEventListener("click", () => this.setMuted(!this.muted));
    this.updateButton();
  }

  async start() {
    if (this.started) {
      await this.resume();
      return;
    }
    this.started = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.info("[Audio] FAILED: Web Audio API unavailable");
      return;
    }

    try {
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : VOLUMES.master;
      this.masterGain.connect(this.context.destination);
      await this.resume();
      this.unlocked = this.context.state === "running";
      if (this.unlocked) console.info("[Audio] Audio unlocked");
      this.loadAssets();
    } catch {
      console.info("[Audio] FAILED: audio context could not be started");
    }
  }

  async resume() {
    if (this.context?.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        // A later user interaction can call start again and retry resume.
      }
    }
  }

  loadAssets() {
    if (this.loadingStarted || !this.context) return;
    this.loadingStarted = true;
    Object.entries(AUDIO_ASSETS).forEach(([name, path]) => this.loadAsset(name, path));
  }

  async loadAsset(name, path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const audioData = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(audioData);
      this.buffers.set(name, buffer);
      console.info(`[Audio] Loaded: ${name}`);

      if (name === "village" || name === "birds" || name === "cart") {
        this.ensureLoop(name);
      }
    } catch {
      this.failed.add(name);
      console.info(`[Audio] FAILED: ${path}`);
    }
  }

  ensureLoop(name) {
    if (!this.context || !this.masterGain || this.loops.has(name) || !this.buffers.has(name)) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    source.loop = true;
    gain.gain.value = this.loopVolumes.get(name) ?? 0;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.loops.set(name, { source, gain });
  }

  setLoopVolume(name, volume) {
    this.loopVolumes.set(name, volume);
    this.ensureLoop(name);
    const loop = this.loops.get(name);
    if (!loop || !this.context) return;
    loop.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.08);
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      sessionStorage.setItem("bailgadi-muted", String(muted));
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers.
    }
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : VOLUMES.master,
        this.context.currentTime,
        0.025,
      );
    }
    this.updateButton();
  }

  updateButton() {
    this.button.textContent = this.muted ? "🔇" : "🔊";
    this.button.setAttribute("aria-pressed", String(!this.muted));
    this.button.setAttribute("aria-label", this.muted ? "Turn sound on" : "Turn sound off");
    this.button.title = this.muted ? "Sound Off" : "Sound On";
  }

  playOneShot(name, volumeScale = 1, playbackRate = 1) {
    if (!this.context || !this.masterGain || this.muted || !this.buffers.has(name)) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    source.playbackRate.value = playbackRate;
    gain.gain.value = Math.min(1, VOLUMES[name] * volumeScale);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  updateMovement({ speed, travelledDistance, stepContact }) {
    const movement = Math.min(Math.abs(speed) / 5.2, 1);
    this.setLoopVolume("cart", VOLUMES.cart * movement);
    if (!this.unlocked || movement < 0.05) return;

    if (stepContact) {
      this.events.footsteps += 1;
      this.playOneShot("hoof", 0.72 + movement * 0.28, 0.92 + movement * 0.14);
    }

    const distance = Math.abs(travelledDistance);
    this.distanceToBell -= distance;
    this.distanceToCreak -= distance;

    if (this.distanceToBell <= 0) {
      this.events.bells += 1;
      this.playOneShot("bell", 0.75 + movement * 0.25, 0.96 + Math.random() * 0.08);
      this.distanceToBell = 10 + (5.5 - 10) * movement + Math.random() * 4;
    }
    if (this.distanceToCreak <= 0) {
      this.events.creaks += 1;
      this.playOneShot("creak", 0.7 + movement * 0.3, 0.92 + Math.random() * 0.1);
      this.distanceToCreak = 13 + Math.random() * 12;
    }
  }

  getDebugState() {
    return {
      muted: this.muted,
      unlocked: this.unlocked,
      contextState: this.context?.state ?? "not-created",
      loaded: [...this.buffers.keys()],
      failed: [...this.failed],
      events: { ...this.events },
    };
  }
}
