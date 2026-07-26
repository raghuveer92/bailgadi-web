const AUDIO_PATHS = {
  ambience: "/audio/village-ambience.mp3",
  footsteps: "/audio/bull-hoofstep.mp3",
  wheels: "/audio/cart-wheels.mp3",
  creak: "/audio/cart-creak.mp3",
  bell: "/audio/bull-bell.mp3",
  driverForward: "/audio/driver-chal.mp3",
  driverBrake: "/audio/driver-ruk.mp3",
};

const CHANNEL_VOLUMES = {
  ambience: 0.2,
  footsteps: 0.3,
  wheels: 0.17,
  creak: 0.13,
  bell: 0.2,
  driverForward: 0.28,
  driverBrake: 0.28,
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
    this.unlocked = false;
    this.started = false;
    this.muted = safeSessionValue("bailgadi-muted") === "true";
    this.distanceToBell = 7;
    this.distanceToCreak = 10;
    this.events = { footsteps: 0, bells: 0, creaks: 0 };
    this.tracks = new Map();

    Object.entries(AUDIO_PATHS).forEach(([name, path]) => {
      const audio = new Audio(path);
      audio.preload = "none";
      audio.loop = name === "ambience" || name === "wheels";
      audio.volume = 0;
      const track = { audio, ready: false, failed: false, desiredVolume: 0 };
      audio.addEventListener("canplaythrough", () => {
        track.ready = true;
        this.syncLoop(name);
      });
      audio.addEventListener("error", () => {
        track.failed = true;
        track.ready = false;
      }, { once: true });
      this.tracks.set(name, track);
    });

    this.button.addEventListener("click", () => this.setMuted(!this.muted));
    this.updateButton();
  }

  start() {
    if (!this.unlocked) {
      this.unlocked = true;
      this.tracks.forEach((track) => {
        try {
          track.audio.load();
        } catch {
          track.failed = true;
        }
      });
    }
    this.started = true;
    this.setLoopVolume("ambience", CHANNEL_VOLUMES.ambience);
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      sessionStorage.setItem("bailgadi-muted", String(muted));
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers.
    }
    this.tracks.forEach((_, name) => this.syncLoop(name));
    this.updateButton();
  }

  updateButton() {
    this.button.textContent = this.muted ? "🔇" : "🔊";
    this.button.setAttribute("aria-pressed", String(!this.muted));
    this.button.setAttribute("aria-label", this.muted ? "Unmute game audio" : "Mute game audio");
  }

  setLoopVolume(name, volume) {
    const track = this.tracks.get(name);
    if (!track) return;
    track.desiredVolume = volume;
    this.syncLoop(name);
  }

  syncLoop(name) {
    const track = this.tracks.get(name);
    if (!track || !track.audio.loop || track.failed) return;

    const volume = this.muted || !this.started ? 0 : track.desiredVolume;
    track.audio.volume = volume;
    if (volume > 0 && track.ready) {
      track.audio.play().catch(() => {});
    } else if (volume === 0) {
      track.audio.pause();
    }
  }

  playOneShot(name, volumeScale = 1, playbackRate = 1) {
    const track = this.tracks.get(name);
    if (!this.unlocked || this.muted || !track?.ready || track.failed) return;
    const sound = track.audio.cloneNode();
    sound.loop = false;
    sound.volume = Math.min(1, CHANNEL_VOLUMES[name] * volumeScale);
    sound.playbackRate = playbackRate;
    sound.play().catch(() => {});
  }

  updateMovement({ speed, travelledDistance, stepContact }) {
    const movement = Math.min(Math.abs(speed) / 5.2, 1);
    this.setLoopVolume("wheels", CHANNEL_VOLUMES.wheels * movement);
    if (!this.unlocked || movement < 0.05) return;

    if (stepContact) {
      this.events.footsteps += 1;
      this.playOneShot("footsteps", 0.55 + movement * 0.45, 0.92 + movement * 0.15);
    }

    const distance = Math.abs(travelledDistance);
    this.distanceToBell -= distance;
    this.distanceToCreak -= distance;

    if (this.distanceToBell <= 0) {
      this.events.bells += 1;
      this.playOneShot("bell", 0.65 + movement * 0.35, 0.96 + Math.random() * 0.08);
      this.distanceToBell = 10 + (5.5 - 10) * movement + Math.random() * 4;
    }
    if (this.distanceToCreak <= 0) {
      this.events.creaks += 1;
      this.playOneShot("creak", 0.55 + movement * 0.35, 0.9 + Math.random() * 0.12);
      this.distanceToCreak = 13 + Math.random() * 12;
    }
  }

  reactToDriver(command) {
    this.playOneShot(command === "forward" ? "driverForward" : "driverBrake");
  }

  getDebugState() {
    return {
      muted: this.muted,
      unlocked: this.unlocked,
      events: { ...this.events },
    };
  }
}
