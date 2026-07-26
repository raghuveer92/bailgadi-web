import * as THREE from "three";
import "./style.css";
import { AudioManager } from "./audio-manager.js";
import { Controls, MAX_CART_SPEED } from "./controls.js";
import {
  animateCart,
  createBullockCart,
  reactDriver,
  resetCartAnimation,
  triggerCartBump,
} from "./cart.js";
import { DustSystem } from "./dust-system.js";
import { createRoadGameplay } from "./road-gameplay.js";
import { VoiceControls } from "./voice-controls.js";
import { createWorld } from "./world.js";

const JOURNEY_DISTANCE = 500;
const START_X = 0;
const START_Z = -20;
const CHECKPOINTS = [400, 300, 200, 100];

const root = document.querySelector("#canvas-root");
const startScreen = document.querySelector("#start-screen");
const finishScreen = document.querySelector("#finish-screen");
const playButton = document.querySelector("#play-button");
const replayButton = document.querySelector("#replay-button");
const hud = document.querySelector("#hud");
const hint = document.querySelector("#hint");
const touchControls = document.querySelector("#touch-controls");
const distanceLabel = document.querySelector("#distance");
const remainingDistanceLabel = document.querySelector("#remaining-distance");
const objectiveLabel = document.querySelector("#objective");
const speedLabel = document.querySelector("#speed");
const speedModeLabel = document.querySelector("#speed-mode");
const checkpointMessage = document.querySelector("#checkpoint-message");
const voiceButton = document.querySelector("#voice-button");
const voiceLabel = document.querySelector("#voice-label");
const voiceMessage = document.querySelector("#voice-message");
const soundButton = document.querySelector("#sound-button");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
root.appendChild(renderer.domElement);

const { obstacles, sun, villageLife } = createWorld(scene);
const roadGameplay = createRoadGameplay(scene);
const { group: cart, animationParts } = createBullockCart();
cart.position.set(START_X, 0.05, START_Z);
scene.add(cart);
const dustSystem = new DustSystem(scene);

const audioManager = new AudioManager(soundButton);
const controls = new Controls({
  root: document,
  onSpeedLevelChange: ({ direction }) => {
    audioManager.playDriverCommand(direction);
    reactDriver(animationParts, direction);
  },
});
const voiceControls = new VoiceControls({
  button: voiceButton,
  label: voiceLabel,
  message: voiceMessage,
  controls,
});
const clock = new THREE.Clock();
const chasePosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const headingVector = new THREE.Vector3();
const previousPosition = cart.position.clone();

const state = {
  started: false,
  speed: 0,
  heading: 0,
  distance: 0,
  progress: 0,
  elapsed: 0,
  collisionPulse: 0,
  collisionStrength: 0,
  journeyStatus: "ready",
  passedCheckpoints: new Set(),
};
let checkpointTimer = 0;

const tuning = {
  maxForward: MAX_CART_SPEED,
  acceleration: 1.65,
  deceleration: 1.45,
  steering: 0.52,
};

camera.position.set(0, 8.5, -33);
camera.lookAt(0, 1.3, -14);

function damp(current, target, smoothing, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

function sceneryObstacleHit(nextX, nextZ) {
  return obstacles.some((obstacle) => {
    const dx = nextX - obstacle.x;
    const dz = nextZ - obstacle.z;
    return dx * dx + dz * dz < (obstacle.radius + 1.65) ** 2;
  });
}

function showCheckpoint(remaining) {
  window.clearTimeout(checkpointTimer);
  checkpointMessage.textContent = `${remaining} m to the village`;
  checkpointMessage.classList.remove("hidden");
  checkpointTimer = window.setTimeout(() => {
    checkpointMessage.classList.add("hidden");
  }, 2100);
}

function beginJourneyFinish() {
  if (state.journeyStatus !== "playing") return;
  state.progress = JOURNEY_DISTANCE;
  state.journeyStatus = "finishing";
  controls.resetAll();
  controls.setEnabled(false);
  hint.classList.add("hidden");
}

function completeJourney() {
  if (state.journeyStatus === "reached") return;
  state.speed = 0;
  state.journeyStatus = "reached";
  controls.resetAll();
  controls.setEnabled(false);
  touchControls.classList.add("hidden");
  checkpointMessage.classList.add("hidden");
  finishScreen.classList.remove("is-hidden");
  replayButton.focus({ preventScroll: true });
}

function updateJourneyProgress() {
  if (state.journeyStatus !== "playing") return;
  state.progress = THREE.MathUtils.clamp(cart.position.z - START_Z, 0, JOURNEY_DISTANCE);
  const remaining = Math.max(0, JOURNEY_DISTANCE - state.progress);
  CHECKPOINTS.forEach((checkpoint) => {
    if (remaining <= checkpoint && !state.passedCheckpoints.has(checkpoint)) {
      state.passedCheckpoints.add(checkpoint);
      showCheckpoint(checkpoint);
    }
  });
  if (remaining <= 0) beginJourneyFinish();
}

function updateMovement(delta) {
  const input = state.journeyStatus === "playing"
    ? controls.getCombinedState()
    : { left: false, right: false, targetSpeed: 0 };
  const oldX = cart.position.x;
  const oldZ = cart.position.z;

  if (state.journeyStatus === "reached") {
    state.speed = 0;
  } else if (state.journeyStatus === "finishing") {
    state.speed = damp(state.speed, 0, 2.25, delta);
    if (Math.abs(state.speed) < 0.025) completeJourney();
  } else {
    const targetSpeed = input.targetSpeed;
    if (state.speed < targetSpeed) {
      const pull =
        0.62
        + Math.min(Math.max(state.speed, 0) / tuning.maxForward, 1) * 0.38;
      state.speed = Math.min(
        targetSpeed,
        state.speed + tuning.acceleration * pull * delta,
      );
    } else if (state.speed > targetSpeed) {
      const slowingRate = targetSpeed === 0
        ? tuning.deceleration
        : tuning.deceleration * 0.82;
      state.speed = Math.max(
        targetSpeed,
        state.speed - slowingRate * delta,
      );
    }
  }

  state.speed = THREE.MathUtils.clamp(state.speed, -0.65, tuning.maxForward);
  if (Math.abs(state.speed - input.targetSpeed) < 0.015) {
    state.speed = input.targetSpeed;
  }

  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const speedRatio = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  if (steerInput && Math.abs(state.speed) > 0.04) {
    const direction = state.speed >= 0 ? 1 : -1;
    state.heading += steerInput * tuning.steering * (0.35 + speedRatio * 0.65) * direction * delta;
  }

  headingVector.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const moveDistance = state.speed * delta;
  const nextX = cart.position.x + headingVector.x * moveDistance;
  const nextZ = cart.position.z + headingVector.z * moveDistance;

  if (sceneryObstacleHit(nextX, nextZ)) {
    state.speed *= -0.12;
    state.collisionPulse = 0.16;
    state.collisionStrength = 0.65;
  } else {
    cart.position.x = THREE.MathUtils.clamp(nextX, -125, 125);
    cart.position.z = THREE.MathUtils.clamp(nextZ, -345, 495);
  }

  cart.rotation.y = state.heading;
  cart.rotation.z = damp(cart.rotation.z, -steerInput * speedRatio * 0.035, 5, delta);
  cart.position.y = 0.05;

  const travelledDistance =
    (cart.position.x - oldX) * headingVector.x
    + (cart.position.z - oldZ) * headingVector.z;
  if (travelledDistance > 0 && state.journeyStatus === "playing") {
    state.distance += travelledDistance;
  }

  if (Math.abs(state.speed) > 0.18 && state.journeyStatus === "playing") {
    const impact = roadGameplay.checkImpact(cart.position, state.heading);
    if (impact) {
      state.speed *= 1 - impact.severity * 0.22;
      state.collisionPulse = 0.3;
      state.collisionStrength = impact.severity;
      triggerCartBump(animationParts, impact.severity, impact.side);
      audioManager.triggerBump(0.78 + impact.severity * 0.22);
    }
  }

  updateJourneyProgress();
  const roadSurface = roadGameplay.sampleSurface(cart.position);
  animateCart(
    animationParts,
    state.speed,
    travelledDistance,
    state.elapsed,
    delta,
    roadSurface,
  );
  dustSystem.update({ cart, speed: state.speed, travelledDistance, delta });
  audioManager.updateMovement({
    speed: state.speed,
    delta,
    steering: Math.abs(steerInput) * speedRatio,
  });
}

function updateCamera(delta) {
  headingVector.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  chasePosition.copy(cart.position)
    .addScaledVector(headingVector, -13.5)
    .add(new THREE.Vector3(0, 7.3, 0));

  const side = new THREE.Vector3(headingVector.z, 0, -headingVector.x);
  const steer = (controls.state.left ? 1 : 0) - (controls.state.right ? 1 : 0);
  chasePosition.addScaledVector(side, -steer * 0.7);

  if (state.collisionPulse > 0) {
    state.collisionPulse = Math.max(0, state.collisionPulse - delta);
    const shake = state.collisionStrength * Math.min(state.collisionPulse / 0.3, 1);
    chasePosition.x += (Math.random() - 0.5) * 0.28 * shake;
    chasePosition.y += (Math.random() - 0.5) * 0.2 * shake;
  }

  camera.position.lerp(chasePosition, 1 - Math.exp(-3.8 * delta));
  lookTarget.copy(cart.position).addScaledVector(headingVector, 4.2);
  lookTarget.y += 1.35;
  camera.lookAt(lookTarget);

  sun.position.x = cart.position.x - 42;
  sun.position.z = cart.position.z - 25;
  sun.target.position.copy(cart.position);
  scene.add(sun.target);
}

function updateHud() {
  const remaining = Math.max(0, JOURNEY_DISTANCE - state.progress);
  distanceLabel.textContent = state.distance < 1000
    ? `${Math.floor(state.distance)} m`
    : `${(state.distance / 1000).toFixed(2)} km`;
  remainingDistanceLabel.textContent = `${Math.ceil(remaining)} m`;
  objectiveLabel.textContent = state.journeyStatus === "reached"
    ? "Village reached"
    : `Reach the village - ${Math.ceil(remaining)}m`;
  speedLabel.textContent = `${Math.abs(state.speed * 3.6).toFixed(1)} km/h`;
  speedModeLabel.textContent = controls.getSpeedMode();
  if (import.meta.env.DEV) {
    document.body.dataset.gameState = JSON.stringify({
      started: state.started,
      speed: Number(state.speed.toFixed(3)),
      distance: Number(state.distance.toFixed(3)),
      progress: Number(state.progress.toFixed(3)),
      remaining: Number(remaining.toFixed(3)),
      journeyStatus: state.journeyStatus,
      passedCheckpoints: [...state.passedCheckpoints],
      cart: cart.position.toArray().map((value) => Number(value.toFixed(3))),
      camera: camera.position.toArray().map((value) => Number(value.toFixed(3))),
      heading: Number(state.heading.toFixed(3)),
      wheelRotation: Number(animationParts.wheels[0].rotation.x.toFixed(3)),
      bullLegs: animationParts.bulls.map((bull) =>
        bull.legs.map((leg) => Number(leg.root.rotation.x.toFixed(3)))
      ),
      suspensionY: Number(animationParts.sprungGroup.position.y.toFixed(3)),
      driverReaction: Number(animationParts.driverReaction.toFixed(3)),
      driverReinReaction: Number(animationParts.driverReinReaction.toFixed(3)),
      dustParticles: dustSystem.getActiveCount(),
      audio: audioManager.getDebugState(),
      input: controls.getCombinedState(),
      voiceEnabled: voiceControls.enabled,
      environment: villageLife.counts,
    });
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  state.elapsed += delta;
  if (state.started) updateMovement(delta);
  villageLife.update({ cartPosition: cart.position, elapsed: state.elapsed, delta });
  updateCamera(delta);
  updateHud();
  renderer.render(scene, camera);
  previousPosition.copy(cart.position);
  requestAnimationFrame(animate);
}

function startGame() {
  state.started = true;
  state.journeyStatus = "playing";
  controls.resetAll();
  controls.setEnabled(true);
  startScreen.classList.add("is-hidden");
  hud.classList.remove("hidden");
  hint.classList.remove("hidden");
  touchControls.classList.remove("hidden");
  audioManager.start();
  playButton.blur();
  setTimeout(() => hint.classList.add("hidden"), 7000);
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("audiotest")) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", bubbles: true }));
    }, 6500);
  }
}

function replayGame() {
  window.clearTimeout(checkpointTimer);
  controls.resetAll();
  controls.setEnabled(true);
  roadGameplay.reset();
  dustSystem.reset();
  resetCartAnimation(animationParts);
  state.speed = 0;
  state.heading = 0;
  state.distance = 0;
  state.progress = 0;
  state.elapsed = 0;
  state.collisionPulse = 0;
  state.collisionStrength = 0;
  state.journeyStatus = "playing";
  state.passedCheckpoints.clear();
  cart.position.set(START_X, 0.05, START_Z);
  cart.rotation.set(0, 0, 0);
  previousPosition.copy(cart.position);
  camera.position.set(0, 8.5, -33);
  camera.lookAt(0, 1.3, -14);
  finishScreen.classList.add("is-hidden");
  checkpointMessage.classList.add("hidden");
  touchControls.classList.remove("hidden");
  replayButton.blur();
}

playButton.addEventListener("click", startGame);
replayButton.addEventListener("click", replayGame);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (event) => event.preventDefault());

window.__bailgadi = {
  getState: () => ({
    started: state.started,
    speed: state.speed,
    distance: state.distance,
    remaining: Math.max(0, JOURNEY_DISTANCE - state.progress),
    journeyStatus: state.journeyStatus,
    cartPosition: cart.position.toArray(),
    cartHeading: state.heading,
    cameraPosition: camera.position.toArray(),
    controls: controls.getCombinedState(),
    voiceEnabled: voiceControls.enabled,
  }),
  start: startGame,
};

animate();

const autoTest = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("autotest")
  : null;
if (autoTest) {
  startGame();
  const driveKey = autoTest === "reverse" ? "ArrowDown" : "ArrowUp";
  window.dispatchEvent(new KeyboardEvent("keydown", { code: driveKey, bubbles: true }));
  if (autoTest === "reverse") {
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: driveKey, bubbles: true }));
    }, 1600);
  }
  setTimeout(() => {
    if (autoTest !== "reverse") {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft", bubbles: true }));
    }
  }, 550);
  setTimeout(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: driveKey, bubbles: true }));
  }, 1600);
}

const voiceTest = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("voicetest")
  : null;
if (voiceTest) {
  startGame();
  voiceControls.applyCommand("forward");
  if (voiceTest === "brake") {
    setTimeout(() => voiceControls.applyCommand("brake"), 900);
  } else if (voiceTest === "manualbrake") {
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown", bubbles: true }));
    }, 900);
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown", bubbles: true }));
    }, 1250);
  }
}
