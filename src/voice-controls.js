export const TRIGGER_THRESHOLD = 0.75;
export const RESET_THRESHOLD = 0.45;
export const MIN_MARGIN = 0.10;
export const MIN_INPUT_LEVEL = 2;
export const CONSECUTIVE_CONFIRMATIONS = 2;
export const COOLDOWN_MS = 1200;
export const VOICE_DEBUG_ENABLED = true;

const MODEL_VERSION = "20260726-122209";
const MODEL_PATH = `/models/bailgadi-voice/model.json?v=${MODEL_VERSION}`;
const METADATA_PATH = `/models/bailgadi-voice/metadata.json?v=${MODEL_VERSION}`;
const COMMAND_LABELS = ["START", "STOP"];
const REQUIRED_LABELS = ["Background Noise", ...COMMAND_LABELS];

export class CommandTriggerGate {
  constructor() {
    this.reset();
  }

  reset() {
    this.candidate = null;
    this.confirmationCount = 0;
    this.locked = false;
    this.lockedCommand = null;
    this.lastTriggerTime = -Infinity;
    this.inputActive = false;
  }

  clearCandidate() {
    this.candidate = null;
    this.confirmationCount = 0;
  }

  getDebugState() {
    return {
      candidate: this.candidate ?? "NONE",
      confirmation: `${this.confirmationCount}/${CONSECUTIVE_CONFIRMATIONS}`,
      inputActive: this.inputActive ? "YES" : "NO",
      recognition: this.locked ? "LOCKED" : "ARMED",
    };
  }

  update(confidence, inputLevel, now = performance.now()) {
    this.inputActive = inputLevel >= MIN_INPUT_LEVEL;
    const [topLabel, topScore] = REQUIRED_LABELS
      .map((label) => [label, confidence[label] ?? 0])
      .sort((a, b) => b[1] - a[1])[0];
    const backgroundScore = confidence["Background Noise"] ?? 0;

    if (this.locked) {
      this.clearCandidate();
      const resetStateReached = topLabel === "Background Noise"
        || (confidence[this.lockedCommand] ?? 0) < RESET_THRESHOLD;
      const cooldownComplete = now - this.lastTriggerTime >= COOLDOWN_MS;
      if (resetStateReached && cooldownComplete) {
        this.locked = false;
        this.lockedCommand = null;
      }
      return null;
    }

    const validCandidate = COMMAND_LABELS.includes(topLabel)
      && topScore >= TRIGGER_THRESHOLD
      && topScore - backgroundScore >= MIN_MARGIN
      && this.inputActive;
    if (!validCandidate) {
      this.clearCandidate();
      return null;
    }

    if (this.candidate === topLabel) {
      this.confirmationCount += 1;
    } else {
      this.candidate = topLabel;
      this.confirmationCount = 1;
    }

    if (this.confirmationCount < CONSECUTIVE_CONFIRMATIONS) return null;

    const detected = topLabel;
    this.lastTriggerTime = now;
    this.locked = true;
    this.lockedCommand = detected;
    return detected;
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
    topPrediction,
    topConfidence,
    triggerNotice,
    lastDetected,
    debugStatus,
    onCommand = () => {},
  }) {
    this.button = button;
    this.label = label;
    this.message = message;
    this.controls = controls;
    this.debugPanel = debugPanel;
    this.debugValues = debugValues;
    this.topPrediction = topPrediction;
    this.topConfidence = topConfidence;
    this.triggerNotice = triggerNotice;
    this.lastDetected = lastDetected;
    this.debugStatus = debugStatus;
    this.onCommand = onCommand;
    this.enabled = false;
    this.starting = false;
    this.listening = false;
    this.recognizer = null;
    this.modelPromise = null;
    this.labels = [];
    this.labelIndexes = new Map();
    this.statusTimer = null;
    this.triggerNoticeTimer = null;
    this.micLevelTimer = null;
    this.micLevelData = null;
    this.micInputLevel = 0;
    this.predictionCallbackCount = 0;
    this.loggedFirstPrediction = false;
    this.loggedPredictionError = false;
    this.triggerGate = new CommandTriggerGate();

    this.supported = Boolean(
      navigator.mediaDevices?.getUserMedia
      && (window.AudioContext || window.webkitAudioContext),
    );
    this.button.dataset.voiceSupported = String(this.supported);
    this.debugPanel?.classList.toggle("hidden", !VOICE_DEBUG_ENABLED);
    this.setDebugStatus("micPermission", "NOT REQUESTED");
    this.setDebugStatus("recognizerLoaded", "NO");
    this.setDebugStatus("recognizerListening", "NO");
    this.setDebugStatus("predictionCallbacks", "0");
    this.setDebugStatus("audioContext", "unavailable");
    this.setDebugStatus("micDetected", "NO");
    this.setDebugStatus("micLevel", "0%");
    this.updateGateDebug();

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
      // speech-commands uses chained Tensor methods such as tensor.argMax().
      // Importing the full bundle registers those methods; tfjs-core alone does not.
      const tf = await import("@tensorflow/tfjs");
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
      this.setDebugStatus("recognizerLoaded", "YES");
      return recognizer;
    })();

    try {
      return await this.modelPromise;
    } catch (error) {
      this.modelPromise = null;
      this.setDebugStatus("recognizerLoaded", "NO");
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
    this.predictionCallbackCount = 0;
    this.loggedFirstPrediction = false;
    this.loggedPredictionError = false;
    this.setDebugStatus("micPermission", "REQUESTING");
    this.setDebugStatus("recognizerListening", "NO");
    this.setDebugStatus("predictionCallbacks", "0");
    this.setDebugStatus("audioContext", "starting");
    this.setDebugStatus("micDetected", "NO");
    this.setDebugStatus("micLevel", "0%");
    this.updateGateDebug();

    try {
      const recognizer = await this.loadModel();
      if (!this.enabled) return;

      console.info("[Voice] starting recognizer.listen()");
      await recognizer.listen(
        (result) => this.handlePrediction(result),
        {
          includeSpectrogram: false,
          probabilityThreshold: 0,
          invokeCallbackOnNoiseAndUnknown: true,
          overlapFactor: 0.5,
        },
      );

      const extractor = recognizer.audioDataExtractor;
      const audioContext = extractor?.audioContext;
      if (audioContext?.state === "suspended") {
        await audioContext.resume();
      }
      const micTrack = extractor?.stream?.getAudioTracks?.()[0];
      const recognizerListening = recognizer.isListening();
      this.setDebugStatus("micPermission", "GRANTED");
      this.setDebugStatus(
        "micDetected",
        micTrack && micTrack.readyState === "live" ? "YES" : "NO",
      );
      this.setDebugStatus("audioContext", audioContext?.state ?? "unavailable");
      this.setDebugStatus("recognizerListening", recognizerListening ? "YES" : "NO");
      if (!recognizerListening) {
        throw new Error("Recognizer did not enter the listening state.");
      }

      this.startMicLevelMeter();
      this.starting = false;
      this.listening = true;
      this.button.disabled = false;
      this.showListening();
    } catch (error) {
      const permissionDenied = error?.name === "NotAllowedError"
        || error?.name === "SecurityError";
      if (permissionDenied) this.setDebugStatus("micPermission", "DENIED");
      const message = permissionDenied
        ? `Microphone permission was denied: ${error?.message || "access blocked"}`
        : `Custom sound recognition could not start: ${error?.message || "unknown error"}`;
      console.warn("[Voice Model]", error?.message || error);
      await this.disable(message);
    }
  }

  async disable(message = "") {
    this.enabled = false;
    this.starting = false;
    clearTimeout(this.statusTimer);
    this.stopMicLevelMeter();

    if (this.recognizer && (this.listening || this.recognizer.isListening())) {
      try {
        await this.recognizer.stopListening();
      } catch {
        // The recognizer may already have released the microphone.
      }
    }

    this.listening = false;
    this.setDebugStatus("recognizerListening", "NO");
    const audioContext = this.recognizer?.audioDataExtractor?.audioContext;
    this.setDebugStatus("audioContext", audioContext?.state ?? "closed");
    this.setDebugStatus("micLevel", "0%");
    this.micInputLevel = 0;
    this.triggerGate.reset();
    this.updateGateDebug();
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

  handlePrediction(result) {
    this.predictionCallbackCount += 1;
    this.setDebugStatus(
      "predictionCallbacks",
      String(this.predictionCallbackCount),
    );

    const scores = Array.from(result?.scores ?? [], Number);
    if (!this.loggedFirstPrediction) {
      this.loggedFirstPrediction = true;
      console.info("[Voice] prediction callback received");
      console.info("[Voice] labels", this.recognizer.wordLabels());
      console.info("[Voice] scores", scores);
    }

    const validScores = scores.length === this.labels.length
      && scores.every(Number.isFinite);
    if (!validScores) {
      if (!this.loggedPredictionError) {
        this.loggedPredictionError = true;
        console.warn(
          `[Voice] Invalid scores: expected ${this.labels.length} numeric values, received`,
          scores,
        );
      }
      return;
    }

    this.handleScores(scores);
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

    const detected = this.triggerGate.update(confidence, this.micInputLevel);
    this.updateGateDebug();
    if (detected) this.applyDetectedLabel(detected);
  }

  applyDetectedLabel(detected) {
    this.setLastDetected(detected);
    this.showTriggerNotice(`${detected} TRIGGERED`);
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

    const [topLabel, topScore] = REQUIRED_LABELS
      .map((label) => [label, confidence[label] ?? 0])
      .sort((a, b) => b[1] - a[1])[0];
    if (this.topPrediction) this.topPrediction.textContent = topLabel;
    if (this.topConfidence) {
      this.topConfidence.textContent = `${Math.round(topScore * 100)}%`;
    }
  }

  showTriggerNotice(message) {
    if (!this.triggerNotice) return;
    clearTimeout(this.triggerNoticeTimer);
    this.triggerNotice.textContent = message;
    this.triggerNotice.classList.add("visible");
    this.triggerNoticeTimer = setTimeout(() => {
      this.triggerNotice.textContent = "";
      this.triggerNotice.classList.remove("visible");
    }, 1200);
  }

  setLastDetected(value) {
    if (this.lastDetected) this.lastDetected.textContent = value;
  }

  setDebugStatus(name, value) {
    const element = this.debugStatus?.[name];
    if (element) element.textContent = value;
  }

  updateGateDebug() {
    const state = this.triggerGate.getDebugState();
    this.setDebugStatus("candidate", state.candidate);
    this.setDebugStatus("confirmation", state.confirmation);
    this.setDebugStatus("inputActive", state.inputActive);
    this.setDebugStatus("recognition", state.recognition);
  }

  startMicLevelMeter() {
    this.stopMicLevelMeter();
    const extractor = this.recognizer?.audioDataExtractor;
    const analyser = extractor?.analyser;
    if (!analyser) return;

    this.micLevelData = new Float32Array(analyser.fftSize);
    this.micLevelTimer = setInterval(() => {
      if (!this.enabled) return;
      analyser.getFloatTimeDomainData(this.micLevelData);
      let sumSquares = 0;
      for (const sample of this.micLevelData) {
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / this.micLevelData.length);
      const level = Math.min(100, Math.round(rms * 350));
      this.micInputLevel = level;
      this.setDebugStatus("micLevel", `${level}%`);
      this.setDebugStatus(
        "inputActive",
        level >= MIN_INPUT_LEVEL ? "YES" : "NO",
      );
      this.setDebugStatus(
        "audioContext",
        extractor.audioContext?.state ?? "unavailable",
      );
      const micTrack = extractor.stream?.getAudioTracks?.()[0];
      this.setDebugStatus(
        "micDetected",
        micTrack && micTrack.readyState === "live" ? "YES" : "NO",
      );
    }, 100);
  }

  stopMicLevelMeter() {
    clearInterval(this.micLevelTimer);
    this.micLevelTimer = null;
    this.micLevelData = null;
    this.micInputLevel = 0;
  }
}
