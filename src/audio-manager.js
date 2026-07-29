import { MAX_CART_SPEED } from "./controls.js";

const AUDIO_ASSETS = {
  village: "/assets/audio/village-ambience.mp3",
  hoof: "/assets/audio/bull-foot-walk.mp3",
  cart: "/assets/audio/wooden-cart-running.mp3",
  breathing: "/assets/audio/bull-breathing.mp3",
  bump: "/assets/audio/cart-bump.mp3",
  chal: "/assets/audio/chal-chal.mp3",
  ruk: "/assets/audio/ruk-ruk.mp3",
};

const VOLUMES = {
  master: 1,
  village: 0.18,
  hoof: 0.45,
  cart: 0.28,
  breathing: 0.12,
  bump: 0.3,
  chal: 0.55,
  ruk: 0.9,
  cargoCreak: 0.2,
  ropeTension: 0.18,
  potRattle: 0.22,
  woodMove: 0.22,
  cargoFail: 0.7,
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
      ["breathing", VOLUMES.breathing],
      ["hoof", 0],
      ["cart", 0],
    ]);
    this.bumpTimer = 4 + Math.random() * 4;
    this.bumpSource = null;
    this.movementAmount = 0;
    this.events = { bumps: 0, chal: 0, ruk: 0 };
    this.driverSources = new Map();
    this.lastDriverPlay = new Map();
    this.pendingDriverCommand = null;
    this.cargoSource = null;
    this.cargoTimer = 2.8;
    this.cargoCueIndex = 0;

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
      this.createCargoBuffers();
      this.loadAssets();
    } catch {
      console.info("[Audio] FAILED: audio context could not be started");
    }
  }

  createCargoBuffers() {
    if (!this.context || this.buffers.has("cargoCreak")) return;
    const sampleRate = this.context.sampleRate;
    const definitions = [
      ["cargoCreak", 0.42, 76, 0.62],
      ["ropeTension", 0.26, 128, 0.5],
      ["potRattle", 0.32, 410, 0.34],
      ["woodMove", 0.38, 98, 0.52],
      ["cargoFail", 0.82, 185, 0.9],
    ];
    definitions.forEach(([name, duration, frequency, noiseAmount]) => {
      const length = Math.floor(sampleRate * duration);
      const buffer = this.context.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let filteredNoise = 0;
      for (let index = 0; index < length; index += 1) {
        const time = index / sampleRate;
        const progress = index / length;
        filteredNoise = filteredNoise * 0.82 + (Math.random() * 2 - 1) * 0.18;
        const envelope = Math.sin(Math.PI * progress) * Math.exp(-progress * 1.6);
        const tone = Math.sin(time * frequency * Math.PI * 2);
        const rattle =
          name === "potRattle"
            ? Math.sin(time * 1180 * Math.PI * 2) * (Math.sin(time * 43) > 0.58 ? 1 : 0)
            : 0;
        const failureCrack =
          name === "cargoFail" && progress < 0.24
            ? (Math.random() * 2 - 1) * (1 - progress / 0.24)
            : 0;
        data[index] =
          (tone * (1 - noiseAmount) + filteredNoise * noiseAmount + rattle * 0.24 + failureCrack)
          * envelope
          * 0.72;
      }
      this.buffers.set(name, buffer);
    });
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

      if (name === "village" || name === "breathing" || name === "hoof" || name === "cart") {
        this.ensureLoop(name);
      }
      if (
        (name === "chal" || name === "ruk")
        && this.pendingDriverCommand?.name === name
        && performance.now() - this.pendingDriverCommand.requestedAt < 2200
      ) {
        const pending = this.pendingDriverCommand;
        this.pendingDriverCommand = null;
        this.playDriverCommand(pending.command);
      }
    } catch {
      this.failed.add(name);
      if (this.pendingDriverCommand?.name === name) this.pendingDriverCommand = null;
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

  setLoopPlaybackRate(name, playbackRate) {
    const loop = this.loops.get(name);
    if (!loop || !this.context) return;
    loop.source.playbackRate.setTargetAtTime(playbackRate, this.context.currentTime, 0.1);
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
    if (!this.context || !this.masterGain || this.muted || !this.buffers.has(name)) return null;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    source.playbackRate.value = playbackRate;
    gain.gain.value = Math.min(1, VOLUMES[name] * volumeScale);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    return source;
  }

  playDriverCommand(command) {
    const name = command === "forward" ? "chal" : "ruk";
    if (!this.buffers.has(name)) {
      if (!this.failed.has(name)) {
        this.pendingDriverCommand = {
          command,
          name,
          requestedAt: performance.now(),
        };
      }
      return;
    }

    const now = this.context?.currentTime ?? 0;
    const lastPlayed = this.lastDriverPlay.get(name) ?? -Infinity;
    if (name === "ruk" && now - lastPlayed < 0.72) return;

    const currentSource = this.driverSources.get(name);
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        // The previous driver call has already ended.
      }
    }

    const source = this.playOneShot(name);
    if (!source) return;
    this.events[name] += 1;
    this.lastDriverPlay.set(name, now);
    this.driverSources.set(name, source);
    source.onended = () => {
      if (this.driverSources.get(name) === source) this.driverSources.delete(name);
    };
  }

  triggerBump(intensity = 1, movement = this.movementAmount) {
    if (!this.unlocked || movement <= 0.035 || this.bumpSource) return false;
    const source = this.playOneShot(
      "bump",
      intensity,
      0.96 + Math.random() * 0.08,
    );
    if (!source) return false;
    this.events.bumps += 1;
    this.bumpSource = source;
    source.onended = () => {
      if (this.bumpSource === source) this.bumpSource = null;
    };
    this.bumpTimer = Math.max(this.bumpTimer, 2.5);
    return true;
  }

  updateCargo(stability, cargoType, tension, roadRoughness, delta) {
    if (!this.unlocked || this.movementAmount <= 0.035 || stability >= 98) return;
    this.cargoTimer -= delta;
    if (this.cargoTimer > 0 || this.cargoSource) return;
    const instability = THREEClamp((100 - stability) / 80, 0, 1);
    let name = "cargoCreak";
    if (cargoType === "clay" || cargoType === "milk") name = "potRattle";
    else if (cargoType === "wood") name = "woodMove";
    else if (tension > 0.52 && this.cargoCueIndex % 2 === 1) name = "ropeTension";
    const source = this.playOneShot(
      name,
      0.28 + instability * 0.72 + roadRoughness * 0.12,
      0.94 + instability * 0.12,
    );
    this.cargoCueIndex += 1;
    this.cargoTimer = 4.8 - instability * 3.35;
    if (!source) return;
    this.cargoSource = source;
    source.onended = () => {
      if (this.cargoSource === source) this.cargoSource = null;
    };
  }

  playCargoFailure() {
    if (this.cargoSource) {
      try {
        this.cargoSource.stop();
      } catch {
        // The cargo cue has already ended.
      }
      this.cargoSource = null;
    }
    this.playOneShot("cargoFail");
  }

  updateMovement(speed, delta, steering, gaitPlaybackRate, roadRoughness) {
    const movement = Math.min(Math.abs(speed) / MAX_CART_SPEED, 1);
    this.movementAmount = movement;
    const moving = movement > 0.035;
    this.setLoopVolume("breathing", VOLUMES.breathing * (1 - movement * 0.55));
    this.setLoopVolume("hoof", moving ? VOLUMES.hoof * (0.62 + movement * 0.38) : 0);
    this.setLoopVolume(
      "cart",
      VOLUMES.cart * movement * (0.82 + roadRoughness * 0.18),
    );
    this.setLoopPlaybackRate("hoof", gaitPlaybackRate);
    this.setLoopPlaybackRate("cart", 0.78 + movement * 0.35);
    if (!this.unlocked || !moving) return;

    this.bumpTimer -= delta * (0.65 + movement * 1.35 + steering * 0.8);
    if (this.bumpTimer <= 0) {
      this.triggerBump(0.72 + movement * 0.2 + roadRoughness * 0.08, movement);
      this.bumpTimer = 5.5 + Math.random() * 6;
    }
  }

  getDebugState() {
    const loops = {};
    this.loops.forEach((loop, name) => {
      loops[name] = {
        volume: Number(loop.gain.gain.value.toFixed(3)),
        playbackRate: Number(loop.source.playbackRate.value.toFixed(3)),
      };
    });
    return {
      muted: this.muted,
      unlocked: this.unlocked,
      contextState: this.context?.state ?? "not-created",
      loaded: [...this.buffers.keys()],
      failed: [...this.failed],
      loops,
      events: { ...this.events },
      cargoCueActive: Boolean(this.cargoSource),
    };
  }
}

function THREEClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
