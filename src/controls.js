const GAME_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export class Controls {
  constructor(root = document) {
    this.state = {
      forward: false,
      brake: false,
      left: false,
      right: false,
    };
    this.voice = {
      forward: false,
      brake: false,
    };

    this.keyMap = {
      KeyW: "forward",
      ArrowUp: "forward",
      KeyS: "brake",
      ArrowDown: "brake",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
    };

    window.addEventListener("keydown", (event) => this.onKey(event, true), { passive: false });
    window.addEventListener("keyup", (event) => this.onKey(event, false), { passive: false });
    window.addEventListener("blur", () => this.reset());

    root.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.dataset.control;
      const set = (active, event) => {
        event.preventDefault();
        this.state[control] = active;
        if (active && control === "brake") this.setVoiceCommand("off");
        button.classList.toggle("active", active);
        if (active && button.setPointerCapture) button.setPointerCapture(event.pointerId);
      };
      button.addEventListener("pointerdown", (event) => set(true, event));
      button.addEventListener("pointerup", (event) => set(false, event));
      button.addEventListener("pointercancel", (event) => set(false, event));
      button.addEventListener("lostpointercapture", () => {
        this.state[control] = false;
        button.classList.remove("active");
      });
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  onKey(event, active) {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    const control = this.keyMap[event.code];
    this.state[control] = active;
    if (active && control === "brake") this.setVoiceCommand("off");
  }

  reset() {
    Object.keys(this.state).forEach((key) => { this.state[key] = false; });
    document.querySelectorAll("[data-control].active").forEach((button) => button.classList.remove("active"));
  }

  getCombinedState() {
    if (this.state.brake) {
      return { ...this.state, forward: false, brake: true };
    }
    if (this.state.forward) {
      return { ...this.state, forward: true, brake: false };
    }
    return {
      ...this.state,
      forward: this.voice.forward,
      brake: this.voice.brake,
    };
  }

  setVoiceCommand(command) {
    this.voice.forward = command === "forward";
    this.voice.brake = command === "brake";
  }

  releaseVoiceBrake() {
    this.voice.brake = false;
  }
}
