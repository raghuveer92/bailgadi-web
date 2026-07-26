export const TRIGGER_THRESHOLD = 0.85;
export const RESET_THRESHOLD = 0.55;
export const COOLDOWN_MS = 1000;
export const VOICE_DEBUG_ENABLED = true;

const MODEL_PATH = "/models/bailgadi-voice/model.json";
const METADATA_PATH = "/models/bailgadi-voice/metadata.json";
const COMMAND_LABELS = ["START", "STOP"];
const REQUIRED_LABELS = ["Background Noise", ...COMMAND_LABELS];

export class CommandTriggerGate {
  constructor() {
    this.armed = { START: true, STOP: true };
    this.lastTriggerTime = -Infinity;
  }

  reset() {
    this.armed.START = true;
    this.armed.STOP = true;
    this.lastTriggerTime = -Infinity;
  }

  update(confidence, now = performance.now()) {
    COMMAND_LABELS.forEach((label) => {
      if ((confidence[label] ?? 0) < RESET_THRESHOLD) {
        this.armed[label] = true;
      }
    });

    const candidate = COMMAND_LABELS
      .filter((label) => (confidence[label] ?? 0) >= TRIGGER_THRESHOLD)
      .sort((a, b) => confidence[b] - confidence[a])[0];

    if (!candidate || !this.armed[candidate]) return null;

    // Consume the threshold crossing even during cooldown so a sustained sound
    // cannot fire later without first falling below the reset threshold.
    this.armed[candidate] = false;
    if (now - this.lastTriggerTime < COOLDOWN_MS) return null;

    this.lastTriggerTime = now;
    return candidate;
  }
}

export class VoiceControls {
  constructor({
    button,
    label,
    message,
    controls,
    debugPanel,
    debugValues,
    lastDetected,
    onCommand = () => {},
  }) {
    this.button = button;
    this.label = label;
    this.message = message;
    this.controls = controls;
    this.debugPanel = debugPanel;
    this.debugValues = debugValues;
    this.lastDetected = lastDetected;
    this.onCommand = onCommand;
    this.enabled = false;
    this.starting = false;
    this.listening = false;
    this.recognizer = null;
    this.modelPromise = null;
    this.labels = [];
    this.labelIndexes = new Map();
    this.statusTimer = null;
    this.triggerGate = new CommandTriggerGate();

    this.supported = Boolean(
      navigator.mediaDevices?.getUserMedia
      && (window.AudioContext || window.webkitAudioContext),
    );
    this.button.dataset.voiceSupported = String(this.supported);
    this.debugPanel?.classList.toggle("hidden", !VOICE_DEBUG_ENABLED);

    if (!this.supported) {
      this.button.disabled = true;
      this.button.setAttribute("aria-disabled", "true");
      this.message.textContent = "Custom sound recognition is unavailable in this browser.";
      return;
    }

    this.button.addEventListener("click", () => {
      if (this.enabled) this.disable();
      else this.enable();
    });
  }

  async loadModel() {
    if (this.recognizer) return this.recognizer;
    if (this.modelPromise) return this.modelPromise;

    this.modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await Promise.all([
        import("@tensorflow/tfjs-backend-webgl"),
        import("@tensorflow/tfjs-backend-cpu"),
      ]);
      const speechCommands = await import("@tensorflow-models/speech-commands");
      await tf.ready();
      const modelUrl = new URL(MODEL_PATH, window.location.href).href;
      const metadataUrl = new URL(METADATA_PATH, window.location.href).href;
      const recognizer = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        modelUrl,
        metadataUrl,
      );
      await recognizer.ensureModelLoaded();

      const labels = recognizer.wordLabels();
      const missingLabels = REQUIRED_LABELS.filter((label) => !labels.includes(label));
      if (missingLabels.length) {
        throw new Error(`Model is missing labels: ${missingLabels.join(", ")}`);
      }

      this.labels = labels;
      this.labelIndexes = new Map(labels.map((label, index) => [label, index]));
      this.recognizer = recognizer;
      return recognizer;
    })();

    try {
      return await this.modelPromise;
    } catch (error) {
      this.modelPromise = null;
      throw error;
    }
  }

  async enable() {
    if (!this.supported || this.enabled || this.starting) return;

    this.enabled = true;
    this.starting = true;
    this.button.disabled = true;
    this.button.setAttribute("aria-pressed", "true");
    this.button.classList.add("listening");
    this.label.textContent = "🎤 Loading...";
    this.message.textContent = "Loading custom sound model…";
    this.triggerGate.reset();
    this.setLastDetected("None");

    try {
      const modelRequest = this.loadModel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      if (!this.enabled) return;
      const recognizer = await modelRequest;
      if (!this.enabled) return;

      await recognizer.listen(
        (result) => this.handleScores(result.scores),
        {
          includeSpectrogram: false,
          probabilityThreshold: 0,
          invokeCallbackOnNoiseAndUnknown: true,
          overlapFactor: 0.5,
        },
      );

      this.starting = false;
      this.listening = true;
      this.button.disabled = false;
      this.showListening();
    } catch (error) {
      const permissionDenied = error?.name === "NotAllowedError"
        || error?.name === "SecurityError";
      const message = permissionDenied
        ? "Microphone permission was denied."
        : "Custom sound recognition could not start. Tap to retry.";
      console.warn("[Voice Model]", error?.message || error);
      await this.disable(message);
    }
  }

  async disable(message = "") {
    this.enabled = false;
    this.starting = false;
    clearTimeout(this.statusTimer);

    if (this.recognizer && (this.listening || this.recognizer.isListening())) {
      try {
        await this.recognizer.stopListening();
      } catch {
        // The recognizer may already have released the microphone.
      }
    }

    this.listening = false;
    this.button.disabled = !this.supported;
    this.button.setAttribute("aria-pressed", "false");
    this.button.classList.remove("listening", "command-go", "command-stop");
    this.label.textContent = "🎤 Voice Off";
    this.message.textContent = message;
    this.updateDebug({
      "Background Noise": 0,
      START: 0,
      STOP: 0,
    });
  }

  handleScores(rawScores) {
    if (!this.enabled) return;

    const scores = Array.from(rawScores, Number);
    const confidence = Object.fromEntries(
      REQUIRED_LABELS.map((label) => [
        label,
        scores[this.labelIndexes.get(label)] ?? 0,
      ]),
    );
    this.updateDebug(confidence);

    const detected = this.triggerGate.update(confidence);
    if (detected) this.applyDetectedLabel(detected);
  }

  applyDetectedLabel(detected) {
    this.setLastDetected(detected);
    this.applyCommand(detected === "START" ? "forward" : "brake", detected);
  }

  showListening() {
    clearTimeout(this.statusTimer);
    this.button.classList.remove("command-go", "command-stop");
    this.button.classList.add("listening");
    this.label.textContent = "🎤 Listening...";
    this.message.textContent = "Custom START / STOP sound recognition is active";
  }

  applyCommand(command, detectedLabel = command === "forward" ? "START" : "STOP") {
    const changed = command === "forward"
      ? this.controls.increaseSpeedLevel("voice-model")
      : this.controls.decreaseSpeedLevel("voice-model");
    this.onCommand(command, changed);
    this.setLastDetected(detectedLabel);
    clearTimeout(this.statusTimer);
    this.button.classList.remove("listening", "command-go", "command-stop");

    if (command === "forward") {
      this.button.classList.add("command-go");
      this.label.textContent = "▶ START";
      this.message.textContent = changed
        ? `Speed: ${this.controls.getSpeedMode()}`
        : "Already at maximum speed";
    } else {
      this.button.classList.add("command-stop");
      this.label.textContent = "■ STOP";
      this.message.textContent = changed
        ? `Speed: ${this.controls.getSpeedMode()}`
        : "Cart is already stopped";
    }

    this.statusTimer = setTimeout(() => {
      if (this.enabled) this.showListening();
    }, 1100);
  }

  updateDebug(confidence) {
    if (!VOICE_DEBUG_ENABLED) return;
    REQUIRED_LABELS.forEach((label) => {
      const element = this.debugValues?.[label];
      if (element) element.textContent = `${Math.round((confidence[label] ?? 0) * 100)}%`;
    });
  }

  setLastDetected(value) {
    if (this.lastDetected) this.lastDetected.textContent = value;
  }
}
