const GO_HINDI = ["चल चल", "चलो", "चल"];
const STOP_HINDI = ["रुक रुक", "रुको", "रुक"];
const GO_ENGLISH = /(^|\s)chalo?(?:\s+chalo?)?(?=\s|$|[.,!?])/;
const STOP_ENGLISH = /(^|\s)ruko?(?:\s+ruko?)?(?=\s|$|[.,!?])/;

export function matchVoiceCommand(transcript) {
  const normalized = transcript
    .toLocaleLowerCase("hi-IN")
    .trim()
    .replace(/\s+/g, " ");

  if (STOP_HINDI.some((phrase) => normalized.includes(phrase)) || STOP_ENGLISH.test(normalized)) {
    return "brake";
  }
  if (GO_HINDI.some((phrase) => normalized.includes(phrase)) || GO_ENGLISH.test(normalized)) {
    return "forward";
  }
  return null;
}

export class VoiceControls {
  constructor({ button, label, message, controls, onCommand = () => {} }) {
    this.button = button;
    this.label = label;
    this.message = message;
    this.controls = controls;
    this.onCommand = onCommand;
    this.enabled = false;
    this.starting = false;
    this.restartTimer = null;
    this.statusTimer = null;
    this.errorStreak = 0;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = Boolean(Recognition);
    this.button.dataset.voiceSupported = String(this.supported);

    if (!this.supported) {
      this.button.disabled = true;
      this.button.setAttribute("aria-disabled", "true");
      this.message.textContent = "Voice control unavailable in this browser";
      return;
    }

    this.recognition = new Recognition();
    this.recognition.lang = "hi-IN";
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.starting = false;
      if (this.enabled) this.showListening();
    };

    this.recognition.onresult = (event) => {
      this.errorStreak = 0;
      for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
        const result = event.results[resultIndex];
        if (!result.isFinal) continue;

        for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
          const command = matchVoiceCommand(result[alternativeIndex].transcript);
          if (command) {
            this.applyCommand(command);
            return;
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      this.starting = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.disable("Microphone permission was denied.");
      } else if (event.error === "audio-capture") {
        this.disable("No microphone is available.");
      } else if (event.error === "network" && this.enabled) {
        this.errorStreak += 1;
        this.message.textContent = "Voice connection interrupted. Retrying…";
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        this.errorStreak += 1;
      }
    };

    this.recognition.onend = () => {
      this.starting = false;
      if (this.enabled) this.scheduleRestart();
    };

    this.button.addEventListener("click", () => {
      if (this.enabled) this.disable();
      else this.enable();
    });
  }

  async enable() {
    if (!this.supported || this.enabled || this.starting) return;
    this.enabled = true;
    this.starting = true;
    this.button.disabled = true;
    this.button.setAttribute("aria-pressed", "true");
    this.button.classList.add("listening");
    this.label.textContent = "🎤 Listening...";
    this.message.textContent = "Say “Chal Chal” or “Ruk Ruk”";

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      this.button.disabled = false;
      this.starting = false;
      this.startRecognition();
    } catch (error) {
      const permissionDenied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      this.disable(permissionDenied ? "Microphone permission was denied." : "Microphone could not be started.");
    }
  }

  disable(message = "") {
    this.enabled = false;
    this.starting = false;
    clearTimeout(this.restartTimer);
    clearTimeout(this.statusTimer);
    this.controls.setVoiceCommand("off");
    this.button.disabled = !this.supported;
    this.button.setAttribute("aria-pressed", "false");
    this.button.classList.remove("listening", "command-go", "command-stop");
    this.label.textContent = "🎤 Voice Off";
    this.message.textContent = message;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // The recognition service is already stopped.
      }
    }
  }

  startRecognition() {
    if (!this.enabled || this.starting) return;
    this.starting = true;
    try {
      this.recognition.start();
    } catch {
      this.starting = false;
      this.scheduleRestart();
    }
  }

  scheduleRestart() {
    clearTimeout(this.restartTimer);
    if (this.errorStreak >= 4) {
      this.disable("Voice listening paused. Tap to retry.");
      return;
    }
    this.restartTimer = setTimeout(() => this.startRecognition(), 300);
  }

  showListening() {
    clearTimeout(this.statusTimer);
    this.button.classList.remove("command-go", "command-stop");
    this.button.classList.add("listening");
    this.label.textContent = "🎤 Listening...";
    this.message.textContent = "Say “Chal Chal” or “Ruk Ruk”";
  }

  applyCommand(command) {
    this.controls.setVoiceCommand(command);
    this.onCommand(command);
    clearTimeout(this.statusTimer);
    this.button.classList.remove("listening", "command-go", "command-stop");

    if (command === "forward") {
      this.button.classList.add("command-go");
      this.label.textContent = "🐂 Chal Chal!";
      this.message.textContent = "Cart moving forward";
    } else {
      this.button.classList.add("command-stop");
      this.label.textContent = "✋ Ruk Ruk!";
      this.message.textContent = "Cart braking";
    }

    this.statusTimer = setTimeout(() => {
      if (this.enabled) this.showListening();
    }, 1800);
  }
}
