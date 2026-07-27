const GAME_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export const SPEED_MODES = ["STOPPED", "SLOW", "NORMAL", "FAST", "MAX"];
export const MAX_CART_SPEED = 30 / 3.6;
export const SPEED_TARGETS = [
  0,
  10 / 3.6,
  20 / 3.6,
  25 / 3.6,
  MAX_CART_SPEED,
];

export class Controls {
  constructor({ root = document, onSpeedLevelChange = () => {} } = {}) {
    this.root = root;
    this.onSpeedLevelChange = onSpeedLevelChange;
    this.enabled = false;
    this.speedLevel = 0;
    this.state = {
      left: false,
      right: false,
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
    window.addEventListener("blur", () => this.resetSteering());

    root.querySelectorAll("[data-control]").forEach((button) => {
      const control = button.dataset.control;
      if (control === "forward" || control === "brake") {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          if (!this.enabled) return;
          if (control === "forward") this.increaseSpeedLevel("touch");
          else this.decreaseSpeedLevel("touch");
          button.classList.add("active");
          if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        });
        const releaseTap = () => button.classList.remove("active");
        button.addEventListener("pointerup", releaseTap);
        button.addEventListener("pointercancel", releaseTap);
        button.addEventListener("lostpointercapture", releaseTap);
      } else {
        const setSteering = (active, event) => {
          event.preventDefault();
          if (!this.enabled) return;
          this.state[control] = active;
          button.classList.toggle("active", active);
          if (active && button.setPointerCapture) button.setPointerCapture(event.pointerId);
        };
        button.addEventListener("pointerdown", (event) => setSteering(true, event));
        button.addEventListener("pointerup", (event) => setSteering(false, event));
        button.addEventListener("pointercancel", (event) => setSteering(false, event));
        button.addEventListener("lostpointercapture", () => {
          this.state[control] = false;
          button.classList.remove("active");
        });
      }
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  onKey(event, active) {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!this.enabled) return;
    const control = this.keyMap[event.code];
    if (control === "forward" || control === "brake") {
      if (!active || event.repeat) return;
      if (control === "forward") this.increaseSpeedLevel("keyboard");
      else this.decreaseSpeedLevel("keyboard");
      return;
    }
    this.state[control] = active;
  }

  increaseSpeedLevel(source = "input") {
    if (!this.enabled || this.speedLevel >= SPEED_MODES.length - 1) return false;
    const previousLevel = this.speedLevel;
    this.speedLevel += 1;
    this.onSpeedLevelChange({
      direction: "forward",
      source,
      previousLevel,
      level: this.speedLevel,
      mode: SPEED_MODES[this.speedLevel],
      targetSpeed: SPEED_TARGETS[this.speedLevel],
    });
    return true;
  }

  decreaseSpeedLevel(source = "input") {
    return this.stopSpeedLevel(source);
  }

  stopSpeedLevel(source = "input") {
    if (!this.enabled || this.speedLevel <= 0) return false;
    const previousLevel = this.speedLevel;
    this.speedLevel = 0;
    this.onSpeedLevelChange({
      direction: "brake",
      source,
      previousLevel,
      level: this.speedLevel,
      mode: SPEED_MODES[this.speedLevel],
      targetSpeed: SPEED_TARGETS[this.speedLevel],
    });
    return true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.resetSteering();
  }

  resetSteering() {
    this.state.left = false;
    this.state.right = false;
    this.root.querySelectorAll("[data-control].active").forEach((button) => {
      button.classList.remove("active");
    });
  }

  resetAll() {
    this.resetSteering();
    this.speedLevel = 0;
  }

  getTargetSpeed() {
    return SPEED_TARGETS[this.speedLevel];
  }

  getSpeedMode() {
    return SPEED_MODES[this.speedLevel];
  }

  getCombinedState() {
    return {
      ...this.state,
      speedLevel: this.speedLevel,
      speedMode: this.getSpeedMode(),
      targetSpeed: this.getTargetSpeed(),
    };
  }
}
