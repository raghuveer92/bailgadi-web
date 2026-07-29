import * as THREE from "three";
import "./style.css";
import { AudioManager } from "./audio-manager.js";
import { CargoPhysicsManager, CARGO_TYPES } from "./cargo-physics-manager.js";
import { Controls, MAX_CART_SPEED, MAX_REVERSE_SPEED } from "./controls.js";
import {
  animateCart,
  createBullockCart,
  reactDriver,
  resetCartAnimation,
  triggerCartBump,
} from "./cart.js";
import { DustSystem } from "./dust-system.js";
import {
  SURFACE_DIRT,
  SURFACE_GRASS,
  SURFACE_GRAVEL,
  SURFACE_MUD,
  SURFACE_ROAD,
} from "./procedural-world.js";
import { createRoadGameplay } from "./road-gameplay.js";
import { COOLDOWN_MS, MIN_INPUT_LEVEL, VoiceControls } from "./voice-controls.js";
import { createWorld } from "./world.js";

const START_X = 0;
const MISSION_END_Z = 480;
const CART_ROAD_CLEARANCE = 0.012;
const ROAD_ZONE_CENTER = "CENTER";
const ROAD_ZONE_EDGE = "EDGE";
const ROAD_ZONE_OFF_ROAD = "OFF_ROAD";
const ROAD_ZONE_FAR_OFF_ROAD = "FAR_OFF_ROAD";
const ROAD_CENTER_RATIO = 0.65;
const ROAD_SHOULDER_WIDTH = 3.5;
const ROAD_MIN_SHOULDER_WIDTH = 3;
const ROAD_FAR_RANGE = 8;
const ROAD_MINIMUM_LATERAL_LIMIT = 15;
const ROAD_LIMIT_WIDTH_RESPONSE = 2.4;
const ROAD_EXCESS_RETURN_RESPONSE = 1.2;
const ROAD_OFF_ROAD_RESISTANCE_MIN = 0.025;
const ROAD_OFF_ROAD_RESISTANCE_MAX = 0.08;
const SURFACE_BLEND_RESPONSE = 4.5;
const SURFACE_PROFILES = Object.freeze({
  [SURFACE_ROAD]: Object.freeze({
    grip: 1,
    rollingResistance: 0,
    steeringFactor: 1,
    vibration: 0,
    dustFactor: 0.45,
    speedMultiplier: 1,
  }),
  [SURFACE_DIRT]: Object.freeze({
    grip: 0.96,
    rollingResistance: 0.025,
    steeringFactor: 0.95,
    vibration: 0.045,
    dustFactor: 1.1,
    speedMultiplier: 0.99,
  }),
  [SURFACE_GRASS]: Object.freeze({
    grip: 0.88,
    rollingResistance: 0.08,
    steeringFactor: 0.87,
    vibration: 0.06,
    dustFactor: 0.65,
    speedMultiplier: 0.94,
  }),
  [SURFACE_GRAVEL]: Object.freeze({
    grip: 0.84,
    rollingResistance: 0.06,
    steeringFactor: 0.91,
    vibration: 0.14,
    dustFactor: 1.6,
    speedMultiplier: 0.96,
  }),
  [SURFACE_MUD]: Object.freeze({
    grip: 0.7,
    rollingResistance: 0.16,
    steeringFactor: 0.78,
    vibration: 0.09,
    dustFactor: 0.08,
    speedMultiplier: 0.86,
  }),
});
const CHECKPOINTS = [400, 300, 200, 100];
const MISSIONS = Object.freeze([
  Object.freeze({
    name: "Rice Delivery",
    cargoType: "rice",
    reward: 120,
    distance: 500,
    timeLimit: 240,
    roadRoughness: 1,
    level: 1,
  }),
  Object.freeze({
    name: "Morning Milk Run",
    cargoType: "milk",
    reward: 155,
    distance: 530,
    timeLimit: 255,
    roadRoughness: 1.08,
    level: 2,
  }),
  Object.freeze({
    name: "Market Vegetables",
    cargoType: "vegetables",
    reward: 185,
    distance: 555,
    timeLimit: 270,
    roadRoughness: 1.15,
    level: 3,
  }),
  Object.freeze({
    name: "Timber Haul",
    cargoType: "wood",
    reward: 220,
    distance: 585,
    timeLimit: 285,
    roadRoughness: 1.23,
    level: 4,
  }),
  Object.freeze({
    name: "Clay Pot Delivery",
    cargoType: "clay",
    reward: 280,
    distance: 620,
    timeLimit: 300,
    roadRoughness: 1.32,
    level: 5,
  }),
]);

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
const journeyProgressFill = document.querySelector("#journey-progress-fill");
const missionPanel = document.querySelector(".objective-panel");
const missionNameLabel = document.querySelector("#mission-name");
const missionRewardLabel = document.querySelector("#mission-reward");
const missionTimeLabel = document.querySelector("#mission-time");
const cargoStabilityValue = document.querySelector("#cargo-stability-value");
const cargoStabilityFill = document.querySelector("#cargo-stability-fill");
const cargoStabilityBar = document.querySelector(".cargo-stability-bar");
const speedLabel = document.querySelector("#speed");
const speedModeLabel = document.querySelector("#speed-mode");
const checkpointMessage = document.querySelector("#checkpoint-message");
const voiceButton = document.querySelector("#voice-button");
const voiceLabel = document.querySelector("#voice-label");
const voiceMessage = document.querySelector("#voice-message");
const voiceDebugPanel = document.querySelector("#voice-debug");
const voiceLastDetected = document.querySelector("#voice-last-detected");
const soundButton = document.querySelector("#sound-button");
const finishEyebrow = document.querySelector(".finish-card .eyebrow");
const finishTitle = document.querySelector("#finish-title");
const finishCopy = document.querySelector(".finish-copy");
const replayLabel = document.querySelector("#replay-label");
const movementDebug = {
  speedLevel: document.querySelector("#movement-speed-level"),
  targetSpeed: document.querySelector("#movement-target-speed"),
  actualSpeed: document.querySelector("#movement-actual-speed"),
  acceleration: document.querySelector("#movement-acceleration"),
  suspension: document.querySelector("#movement-suspension"),
  cameraDistance: document.querySelector("#movement-camera-distance"),
  ropeTension: document.querySelector("#movement-rope-tension"),
  reinTension: document.querySelector("#movement-rein-tension"),
  driverInput: document.querySelector("#movement-driver-input"),
  cargoStability: document.querySelector("#cargo-debug-stability"),
  cargoDamage: document.querySelector("#cargo-debug-damage"),
  cargoType: document.querySelector("#cargo-debug-type"),
  cargoSuspension: document.querySelector("#cargo-debug-suspension"),
  cargoTurn: document.querySelector("#cargo-debug-turn"),
  cargoRoughness: document.querySelector("#cargo-debug-roughness"),
  cargoOffset: document.querySelector("#cargo-debug-offset"),
  activeNPCs: document.querySelector("#world-debug-npcs"),
  activeAnimals: document.querySelector("#world-debug-animals"),
  spawnedObjects: document.querySelector("#world-debug-spawned"),
  poolUsage: document.querySelector("#world-debug-pool"),
  ambientEvent: document.querySelector("#world-debug-event"),
  averageNPCUpdate: document.querySelector("#world-debug-update-time"),
  currentChunk: document.querySelector("#procedural-debug-chunk"),
  loadedChunks: document.querySelector("#procedural-debug-loaded"),
  chunkPoolSize: document.querySelector("#procedural-debug-pool"),
  currentTheme: document.querySelector("#procedural-debug-theme"),
  currentVillage: document.querySelector("#procedural-debug-village"),
  landmark: document.querySelector("#procedural-debug-landmark"),
  objectsSpawned: document.querySelector("#procedural-debug-objects"),
  lodLevel: document.querySelector("#procedural-debug-lod"),
  drawCalls: document.querySelector("#procedural-debug-draw-calls"),
  fps: document.querySelector("#procedural-debug-fps"),
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
function getRenderPixelRatio() {
  const mobileViewport = Math.min(window.innerWidth, window.innerHeight) < 800;
  return Math.min(window.devicePixelRatio, mobileViewport ? 1.5 : 2);
}
renderer.setPixelRatio(getRenderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
root.appendChild(renderer.domElement);

const {
  obstacles,
  sun,
  villageLife,
  worldGenerator,
  sampleRoad,
} = createWorld(scene);
const roadGameplay = createRoadGameplay(scene);
const { group: cart, animationParts } = createBullockCart();
cart.position.set(START_X, 0.05, MISSION_END_Z - MISSIONS[0].distance);
scene.add(cart);
const dustSystem = new DustSystem(scene);
const cargoPhysics = new CargoPhysicsManager(
  animationParts.cargoRoot,
  animationParts.cargoGroups,
  animationParts,
);

const audioManager = new AudioManager(soundButton);
villageLife.setAudioManager(audioManager);
const controls = new Controls({
  root: document,
  onSpeedLevelChange: ({ direction, source }) => {
    const driverDirection = direction === "forward" ? "forward" : "brake";
    if (source !== "voice-model") audioManager.playDriverCommand(driverDirection);
    reactDriver(animationParts, driverDirection, source);
  },
});
const voiceControls = new VoiceControls({
  button: voiceButton,
  label: voiceLabel,
  message: voiceMessage,
  controls,
  debugPanel: voiceDebugPanel,
  debugValues: {
    START: document.querySelector("#voice-debug-start"),
    STOP: document.querySelector("#voice-debug-stop"),
    "Background Noise": document.querySelector("#voice-debug-background"),
  },
  topPrediction: document.querySelector("#voice-top-prediction"),
  topConfidence: document.querySelector("#voice-top-confidence"),
  triggerNotice: document.querySelector("#voice-trigger-notice"),
  lastDetected: voiceLastDetected,
  debugStatus: {
    micPermission: document.querySelector("#voice-mic-permission"),
    recognizerLoaded: document.querySelector("#voice-recognizer-loaded"),
    recognizerListening: document.querySelector("#voice-recognizer-listening"),
    predictionCallbacks: document.querySelector("#voice-prediction-callbacks"),
    audioContext: document.querySelector("#voice-audio-context"),
    micDetected: document.querySelector("#voice-mic-detected"),
    micLevel: document.querySelector("#voice-mic-level"),
    candidate: document.querySelector("#voice-candidate"),
    confirmation: document.querySelector("#voice-confirmation"),
    inputActive: document.querySelector("#voice-input-active"),
    recognition: document.querySelector("#voice-recognition-state"),
  },
});
const clock = new THREE.Clock();
const chasePosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const headingVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const previousPosition = cart.position.clone();
const roadSurface = { roughness: 0, roll: 0 };
const currentRoadSample = {};
const aheadRoadSample = {};
const behindRoadSample = {};
const aheadRoadPosition = { x: 0, z: 0 };
const behindRoadPosition = { x: 0, z: 0 };
const candidateRoadPosition = { x: 0, z: 0 };
const roadState = {
  zone: ROAD_ZONE_CENTER,
  lateralOffset: 0,
  absoluteOffset: 0,
  normalizedOffset: 0,
  roadHalfWidth: 0,
  shoulderWidth: ROAD_SHOULDER_WIDTH,
  distanceBeyondRoad: 0,
  isOnRoad: true,
  isNearEdge: false,
  isOffRoad: false,
  isFarOffRoad: false,
  maximumAllowedLateralOffset: ROAD_MINIMUM_LATERAL_LIMIT,
  boundaryResistance: 0,
  enteredEdge: false,
  enteredOffRoad: false,
  enteredFarOffRoad: false,
  returnedToRoad: false,
};
const surfaceState = {
  type: SURFACE_ROAD,
  grip: 1,
  rollingResistance: 0,
  steeringFactor: 1,
  vibration: 0,
  dustFactor: SURFACE_PROFILES[SURFACE_ROAD].dustFactor,
  speedMultiplier: 1,
};

const state = {
  started: false,
  speed: 0,
  heading: 0,
  distance: 0,
  progress: 0,
  elapsed: 0,
  collisionPulse: 0,
  collisionStrength: 0,
  acceleration: 0,
  cameraDistance: 0,
  movementDebugTimer: 0,
  hudProgressBucket: -1,
  stabilityHudBucket: -1,
  cargoImpact: 0,
  cargoCameraFeedback: 0,
  lateralOffset: 0,
  steeringOffset: 0,
  roadHeading: 0,
  terrainPitch: 0,
  missionIndex: 0,
  nextMissionIndex: 1,
  mission: MISSIONS[0],
  journeyStatus: "ready",
  passedCheckpoints: new Set(),
};
let checkpointTimer = 0;

const tuning = {
  maxForward: MAX_CART_SPEED,
  acceleration: 1.45,
  braking: 1.8,
  speedResponse: 0.92,
  accelerationResponse: 2.4,
  brakingResponse: 3.1,
  steering: 0.52,
  maxSteeringOffset: 0.38,
  steeringReturn: 2.1,
  headingResponse: 5.2,
  terrainHeightResponse: 5.5,
  terrainPitchResponse: 4.2,
  terrainSampleDistance: 4.5,
  cameraDistance: 11.8,
  cameraSpeedPullback: 2,
  cameraHeight: 6.35,
};

function updateResponsiveFraming() {
  const isMobile = window.innerWidth <= 800;
  const isPortrait = window.innerHeight > window.innerWidth;
  tuning.cameraDistance = isMobile ? (isPortrait ? 13.1 : 12.2) : 11.8;
  tuning.cameraHeight = isMobile ? (isPortrait ? 7.15 : 6.65) : 6.35;
  camera.fov = isMobile ? (isPortrait ? 58 : 55) : 52;
  camera.updateProjectionMatrix();
}

updateResponsiveFraming();
camera.position.set(
  0,
  tuning.cameraHeight + 0.8,
  MISSION_END_Z - MISSIONS[0].distance - tuning.cameraDistance,
);
camera.lookAt(0, 1.4, MISSION_END_Z - MISSIONS[0].distance + 4.4);

function damp(current, target, smoothing, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

function wrappedAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function dampAngle(current, target, smoothing, delta) {
  return current + wrappedAngleDelta(current, target) * (1 - Math.exp(-smoothing * delta));
}

function smoothstep01(value) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function missionStartZ() {
  return MISSION_END_Z - state.mission.distance;
}

function updateCurrentRoadSample() {
  sampleRoad(cart.position, state.mission.level, currentRoadSample);
  state.roadHeading = Math.atan2(
    currentRoadSample.tangentX,
    currentRoadSample.tangentZ,
  );
}

function updateRoadSamples() {
  updateCurrentRoadSample();
  const sampleDistance = tuning.terrainSampleDistance;
  aheadRoadPosition.x = cart.position.x
    + currentRoadSample.tangentX * sampleDistance;
  aheadRoadPosition.z = cart.position.z
    + currentRoadSample.tangentZ * sampleDistance;
  behindRoadPosition.x = cart.position.x
    - currentRoadSample.tangentX * sampleDistance;
  behindRoadPosition.z = cart.position.z
    - currentRoadSample.tangentZ * sampleDistance;
  sampleRoad(aheadRoadPosition, state.mission.level, aheadRoadSample);
  sampleRoad(behindRoadPosition, state.mission.level, behindRoadSample);
}

function updateTerrainPose(delta, snap = false) {
  const targetY = currentRoadSample.height + CART_ROAD_CLEARANCE;
  const sampleDeltaX = aheadRoadSample.centerX - behindRoadSample.centerX;
  const sampleDeltaZ = aheadRoadPosition.z - behindRoadPosition.z;
  const sampleDistance = Math.hypot(sampleDeltaX, sampleDeltaZ);
  const targetPitch = -Math.atan2(
    aheadRoadSample.height - behindRoadSample.height,
    sampleDistance,
  );
  if (snap) {
    cart.position.y = targetY;
    state.terrainPitch = targetPitch;
  } else {
    cart.position.y = damp(
      cart.position.y,
      targetY,
      tuning.terrainHeightResponse,
      delta,
    );
    state.terrainPitch = damp(
      state.terrainPitch,
      targetPitch,
      tuning.terrainPitchResponse,
      delta,
    );
  }
  cart.rotation.x = state.terrainPitch;
}

function initializeRoadPose() {
  updateRoadSamples();
  state.lateralOffset = (
    cart.position.x - currentRoadSample.centerX
  ) * currentRoadSample.tangentZ;
  state.steeringOffset = 0;
  state.heading = state.roadHeading;
  cart.rotation.y = state.heading;
  updateTerrainPose(0, true);
  updateRoadState(0, true);
  updateSurfaceState(0, true);
}

function updateRoadState(delta, resetTransitions = false) {
  const previousZone = roadState.zone;
  const lateralOffset = state.lateralOffset;
  const absoluteOffset = Math.abs(lateralOffset);
  const roadHalfWidth = currentRoadSample.width * 0.5;
  const shoulderWidth = Math.max(
    ROAD_SHOULDER_WIDTH,
    ROAD_MIN_SHOULDER_WIDTH,
  );
  const farOffRoadThreshold = roadHalfWidth + shoulderWidth;
  const targetMaximumOffset = Math.max(
    ROAD_MINIMUM_LATERAL_LIMIT,
    farOffRoadThreshold + ROAD_FAR_RANGE,
  );
  let zone = ROAD_ZONE_CENTER;
  if (absoluteOffset > farOffRoadThreshold) {
    zone = ROAD_ZONE_FAR_OFF_ROAD;
  } else if (absoluteOffset > roadHalfWidth) {
    zone = ROAD_ZONE_OFF_ROAD;
  } else if (absoluteOffset > roadHalfWidth * ROAD_CENTER_RATIO) {
    zone = ROAD_ZONE_EDGE;
  }

  roadState.zone = zone;
  roadState.lateralOffset = lateralOffset;
  roadState.absoluteOffset = absoluteOffset;
  roadState.normalizedOffset = roadHalfWidth > 0
    ? lateralOffset / roadHalfWidth
    : 0;
  roadState.roadHalfWidth = roadHalfWidth;
  roadState.shoulderWidth = shoulderWidth;
  roadState.distanceBeyondRoad = Math.max(0, absoluteOffset - roadHalfWidth);
  roadState.isOnRoad = zone === ROAD_ZONE_CENTER || zone === ROAD_ZONE_EDGE;
  roadState.isNearEdge = zone === ROAD_ZONE_EDGE;
  roadState.isOffRoad = (
    zone === ROAD_ZONE_OFF_ROAD
    || zone === ROAD_ZONE_FAR_OFF_ROAD
  );
  roadState.isFarOffRoad = zone === ROAD_ZONE_FAR_OFF_ROAD;
  roadState.maximumAllowedLateralOffset = resetTransitions
    ? targetMaximumOffset
    : damp(
      roadState.maximumAllowedLateralOffset,
      targetMaximumOffset,
      ROAD_LIMIT_WIDTH_RESPONSE,
      delta,
    );
  roadState.enteredEdge = !resetTransitions
    && zone === ROAD_ZONE_EDGE
    && previousZone !== ROAD_ZONE_EDGE;
  roadState.enteredOffRoad = !resetTransitions
    && zone === ROAD_ZONE_OFF_ROAD
    && previousZone !== ROAD_ZONE_OFF_ROAD;
  roadState.enteredFarOffRoad = !resetTransitions
    && zone === ROAD_ZONE_FAR_OFF_ROAD
    && previousZone !== ROAD_ZONE_FAR_OFF_ROAD;
  roadState.returnedToRoad = !resetTransitions
    && (zone === ROAD_ZONE_CENTER || zone === ROAD_ZONE_EDGE)
    && (
      previousZone === ROAD_ZONE_OFF_ROAD
      || previousZone === ROAD_ZONE_FAR_OFF_ROAD
    );
}

function updateSurfaceState(delta, snap = false) {
  let surfaceType = SURFACE_ROAD;
  if (roadState.zone === ROAD_ZONE_EDGE) {
    surfaceType = currentRoadSample.edgeSurfaceType;
  } else if (roadState.zone === ROAD_ZONE_OFF_ROAD) {
    surfaceType = currentRoadSample.offRoadSurfaceType;
  } else if (roadState.zone === ROAD_ZONE_FAR_OFF_ROAD) {
    surfaceType = currentRoadSample.farOffRoadSurfaceType;
  }
  const profile = SURFACE_PROFILES[surfaceType];
  surfaceState.type = surfaceType;
  if (snap) {
    surfaceState.grip = profile.grip;
    surfaceState.rollingResistance = profile.rollingResistance;
    surfaceState.steeringFactor = profile.steeringFactor;
    surfaceState.vibration = profile.vibration;
    surfaceState.dustFactor = profile.dustFactor;
    surfaceState.speedMultiplier = profile.speedMultiplier;
    return;
  }
  surfaceState.grip = damp(
    surfaceState.grip,
    profile.grip,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
  surfaceState.rollingResistance = damp(
    surfaceState.rollingResistance,
    profile.rollingResistance,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
  surfaceState.steeringFactor = damp(
    surfaceState.steeringFactor,
    profile.steeringFactor,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
  surfaceState.vibration = damp(
    surfaceState.vibration,
    profile.vibration,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
  surfaceState.dustFactor = damp(
    surfaceState.dustFactor,
    profile.dustFactor,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
  surfaceState.speedMultiplier = damp(
    surfaceState.speedMultiplier,
    profile.speedMultiplier,
    SURFACE_BLEND_RESPONSE,
    delta,
  );
}

function formatMissionTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
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
  state.progress = state.mission.distance;
  state.journeyStatus = "finishing";
  controls.resetAll();
  controls.setEnabled(false);
  hint.classList.add("hidden");
}

function showMissionResult(eyebrow, title, copy, buttonLabel) {
  finishEyebrow.textContent = eyebrow;
  finishTitle.textContent = title;
  finishCopy.textContent = copy;
  replayLabel.textContent = buttonLabel;
  finishScreen.classList.remove("is-hidden");
  replayButton.focus({ preventScroll: true });
}

function completeJourney() {
  if (state.journeyStatus === "reached") return;
  state.speed = 0;
  state.acceleration = 0;
  state.journeyStatus = "reached";
  controls.resetAll();
  controls.setEnabled(false);
  touchControls.classList.add("hidden");
  checkpointMessage.classList.add("hidden");
  state.nextMissionIndex = (state.missionIndex + 1) % MISSIONS.length;
  showMissionResult(
    "Journey complete",
    "Village Reached!",
    `The ${CARGO_TYPES[state.mission.cargoType].label.toLowerCase()} arrived safely.`,
    "NEXT MISSION",
  );
}

function failCargoMission() {
  if (state.journeyStatus !== "playing") return;
  state.speed = 0;
  state.acceleration = 0;
  state.journeyStatus = "cargo-lost";
  state.nextMissionIndex = (state.missionIndex + 1) % MISSIONS.length;
  controls.resetAll();
  controls.setEnabled(false);
  touchControls.classList.add("hidden");
  hint.classList.add("hidden");
  checkpointMessage.classList.add("hidden");
  audioManager.playCargoFailure();
  showMissionResult(
    "Mission failed",
    "Cargo Damaged",
    "The load could not survive the journey. A new delivery is ready.",
    "NEW MISSION",
  );
}

function updateJourneyProgress() {
  if (state.journeyStatus !== "playing") return;
  state.progress = THREE.MathUtils.clamp(
    cart.position.z - missionStartZ(),
    0,
    state.mission.distance,
  );
  const remaining = Math.max(0, state.mission.distance - state.progress);
  CHECKPOINTS.forEach((checkpoint) => {
    if (remaining <= checkpoint && !state.passedCheckpoints.has(checkpoint)) {
      state.passedCheckpoints.add(checkpoint);
      showCheckpoint(checkpoint);
    }
  });
  if (remaining <= 0) beginJourneyFinish();
}

function updateMovement(delta) {
  const targetSpeed = state.journeyStatus === "playing"
    ? controls.getTargetSpeed() * surfaceState.speedMultiplier
    : 0;
  const previousSpeed = state.speed;
  const oldX = cart.position.x;
  const oldZ = cart.position.z;

  if (state.journeyStatus === "reached") {
    state.speed = 0;
    state.acceleration = 0;
  } else if (state.journeyStatus === "finishing") {
    state.speed = damp(state.speed, 0, 2.25, delta);
    state.acceleration = damp(
      state.acceleration,
      (state.speed - previousSpeed) / Math.max(delta, 0.001),
      5,
      delta,
    );
    if (Math.abs(state.speed) < 0.025) completeJourney();
  } else {
    const speedError = targetSpeed - state.speed;
    if (Math.abs(speedError) < 0.012 && Math.abs(state.acceleration) < 0.025) {
      state.speed = targetSpeed;
      state.acceleration = 0;
    } else {
      const desiredAcceleration = THREE.MathUtils.clamp(
        speedError * tuning.speedResponse,
        -tuning.braking,
        tuning.acceleration * surfaceState.speedMultiplier,
      );
      const response = speedError < 0
        ? tuning.brakingResponse
        : tuning.accelerationResponse;
      state.acceleration = damp(
        state.acceleration,
        desiredAcceleration,
        response,
        delta,
      );
      const nextSpeed = state.speed + state.acceleration * delta;
      const crossedTarget =
        (speedError > 0 && nextSpeed >= targetSpeed)
        || (speedError < 0 && nextSpeed <= targetSpeed);
      state.speed = crossedTarget ? targetSpeed : nextSpeed;
      if (crossedTarget) state.acceleration = 0;
    }
  }

  state.speed = THREE.MathUtils.clamp(
    state.speed,
    -MAX_REVERSE_SPEED,
    tuning.maxForward,
  );
  const steerInput =
    (controls.state.left ? 1 : 0)
    - (controls.state.right ? 1 : 0);
  const speedRatio = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  if (steerInput && Math.abs(state.speed) > 0.04) {
    const direction = state.speed >= 0 ? 1 : -1;
    state.steeringOffset += (
      steerInput
      * tuning.steering
      * surfaceState.steeringFactor
      * (0.35 + speedRatio * 0.65)
      * direction
      * delta
    );
  } else if (!steerInput) {
    state.steeringOffset = damp(
      state.steeringOffset,
      0,
      tuning.steeringReturn,
      delta,
    );
  }
  state.steeringOffset = THREE.MathUtils.clamp(
    state.steeringOffset,
    -tuning.maxSteeringOffset,
    tuning.maxSteeringOffset,
  );

  updateCurrentRoadSample();
  state.heading = dampAngle(
    state.heading,
    state.roadHeading + state.steeringOffset,
    tuning.headingResponse,
    delta,
  );
  headingVector.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const moveDistance = state.speed * delta;
  const unconstrainedX = cart.position.x + headingVector.x * moveDistance;
  const nextZ = THREE.MathUtils.clamp(
    cart.position.z + headingVector.z * moveDistance,
    -345,
    495,
  );
  candidateRoadPosition.x = unconstrainedX;
  candidateRoadPosition.z = nextZ;
  sampleRoad(candidateRoadPosition, state.mission.level, aheadRoadSample);
  const rawCandidateLateralOffset = (
    unconstrainedX - aheadRoadSample.centerX
  ) * aheadRoadSample.tangentZ;
  const candidateRoadHalfWidth = aheadRoadSample.width * 0.5;
  const candidateShoulderWidth = Math.max(
    ROAD_SHOULDER_WIDTH,
    ROAD_MIN_SHOULDER_WIDTH,
  );
  const candidateFarThreshold = candidateRoadHalfWidth + candidateShoulderWidth;
  const candidateAbsoluteOffset = Math.abs(rawCandidateLateralOffset);
  let boundaryResistance = 0;
  if (candidateAbsoluteOffset > candidateFarThreshold) {
    const farProgress = (
      candidateAbsoluteOffset - candidateFarThreshold
    ) / Math.max(
      roadState.maximumAllowedLateralOffset - candidateFarThreshold,
      0.001,
    );
    boundaryResistance = (
      ROAD_OFF_ROAD_RESISTANCE_MAX
      + (1 - ROAD_OFF_ROAD_RESISTANCE_MAX) * smoothstep01(farProgress)
    );
  } else if (candidateAbsoluteOffset > candidateRoadHalfWidth) {
    const shoulderProgress = (
      candidateAbsoluteOffset - candidateRoadHalfWidth
    ) / candidateShoulderWidth;
    boundaryResistance = (
      ROAD_OFF_ROAD_RESISTANCE_MIN
      + (
        ROAD_OFF_ROAD_RESISTANCE_MAX
        - ROAD_OFF_ROAD_RESISTANCE_MIN
      ) * smoothstep01(shoulderProgress)
    );
  }
  const lateralDelta = rawCandidateLateralOffset - state.lateralOffset;
  const movingOutward = (
    Math.abs(rawCandidateLateralOffset) > Math.abs(state.lateralOffset)
  );
  let candidateLateralOffset = movingOutward
    ? state.lateralOffset + lateralDelta * (1 - boundaryResistance)
    : rawCandidateLateralOffset;
  const excessOffset = (
    Math.abs(candidateLateralOffset)
    - roadState.maximumAllowedLateralOffset
  );
  if (excessOffset > 0) {
    candidateLateralOffset -= (
      Math.sign(candidateLateralOffset)
      * excessOffset
      * (1 - Math.exp(-ROAD_EXCESS_RETURN_RESPONSE * delta))
    );
  }
  roadState.boundaryResistance = movingOutward ? boundaryResistance : 0;
  const nextX = aheadRoadSample.centerX
    + candidateLateralOffset / Math.max(aheadRoadSample.tangentZ, 0.001);

  if (sceneryObstacleHit(nextX, nextZ)) {
    state.speed *= -0.12;
    state.collisionPulse = 0.16;
    state.collisionStrength = 0.65;
    state.cargoImpact = Math.max(state.cargoImpact, 0.65);
  } else {
    cart.position.x = nextX;
    cart.position.z = nextZ;
    state.lateralOffset = candidateLateralOffset;
  }

  cart.rotation.y = state.heading;
  cart.rotation.z = damp(cart.rotation.z, -steerInput * speedRatio * 0.035, 5, delta);
  updateRoadSamples();
  updateTerrainPose(delta);
  updateRoadState(delta);
  updateSurfaceState(delta);

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
      state.cargoImpact = Math.max(state.cargoImpact, impact.severity);
      triggerCartBump(animationParts, impact.severity, impact.side);
      audioManager.triggerBump(
        0.78 + impact.severity * 0.22,
        Math.min(Math.abs(state.speed) / tuning.maxForward, 1),
      );
    }
  }

  updateJourneyProgress();
  roadGameplay.sampleSurface(cart.position, roadSurface);
  roadSurface.roughness = THREE.MathUtils.clamp(
    roadSurface.roughness * state.mission.roadRoughness,
    0,
    1,
  );
  const turnStrength = steerInput * speedRatio;
  cargoPhysics.update(
    delta,
    state.acceleration,
    speedRatio,
    turnStrength,
    roadSurface.roughness,
    state.cargoImpact,
    animationParts.suspensionY,
  );
  state.cargoImpact = 0;
  if (cargoPhysics.stability.justLost) failCargoMission();
  animateCart(
    animationParts,
    state.speed,
    travelledDistance,
    state.elapsed,
    delta,
    roadSurface,
    state.acceleration,
  );
  dustSystem.update({
    cart,
    speed: state.speed,
    travelledDistance: travelledDistance * surfaceState.dustFactor,
    delta,
  });
  audioManager.updateMovement(
    state.speed,
    delta,
    Math.abs(steerInput) * speedRatio,
    animationParts.gaitPlaybackRate,
    roadSurface.roughness,
  );
  audioManager.updateCargo(
    cargoPhysics.stability.stability,
    state.mission.cargoType,
    animationParts.ropeRein.ropeTension,
    roadSurface.roughness,
    delta,
  );
}

function updateCamera(delta) {
  headingVector.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const movement = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  const targetCargoFeedback = THREE.MathUtils.clamp(
    (70 - cargoPhysics.stability.stability) / 70,
    0,
    1,
  );
  state.cargoCameraFeedback = damp(
    state.cargoCameraFeedback,
    targetCargoFeedback,
    targetCargoFeedback > state.cargoCameraFeedback ? 2.4 : 1.45,
    delta,
  );
  const chaseDistance =
    tuning.cameraDistance
    + movement * tuning.cameraSpeedPullback
    - state.cargoCameraFeedback * 0.58;
  const chaseHeight = tuning.cameraHeight + movement * 0.22;
  chasePosition.copy(cart.position)
    .addScaledVector(headingVector, -chaseDistance);
  cameraOffset.set(0, chaseHeight, 0);
  chasePosition.add(cameraOffset);

  sideVector.set(headingVector.z, 0, -headingVector.x);
  const steer = (controls.state.left ? 1 : 0) - (controls.state.right ? 1 : 0);
  chasePosition.addScaledVector(sideVector, -steer * 0.7);

  const surfaceShake =
    movement
    * (
      Math.abs(animationParts.suspensionY) * 0.32
      + animationParts.surfaceRoughness * 0.009
    );
  chasePosition.x += Math.sin(state.elapsed * 15.7) * surfaceShake;
  chasePosition.y += Math.sin(state.elapsed * 18.3 + 0.7) * surfaceShake * 0.72;
  const terrainSurfaceShake = movement * surfaceState.vibration * 0.018;
  chasePosition.x += Math.sin(state.elapsed * 21.1 + 0.2) * terrainSurfaceShake;
  chasePosition.y += Math.sin(state.elapsed * 24.7 + 1.4) * terrainSurfaceShake * 0.7;
  const cargoShake = state.cargoCameraFeedback * (0.018 + roadSurface.roughness * 0.028);
  chasePosition.x += Math.sin(state.elapsed * 12.9 + 0.4) * cargoShake;
  chasePosition.y += Math.sin(state.elapsed * 14.7 + 1.1) * cargoShake * 0.72;

  if (state.collisionPulse > 0) {
    state.collisionPulse = Math.max(0, state.collisionPulse - delta);
    const shake = state.collisionStrength * Math.min(state.collisionPulse / 0.3, 1);
    chasePosition.x += Math.sin(state.elapsed * 34) * 0.14 * shake;
    chasePosition.y += Math.sin(state.elapsed * 29 + 0.8) * 0.1 * shake;
  }

  camera.position.lerp(
    chasePosition,
    1 - Math.exp(-(3.55 - movement * 0.35) * delta),
  );
  lookTarget.copy(cart.position).addScaledVector(headingVector, 5.1 + movement * 1.05);
  lookTarget.y += 1.25 + animationParts.suspensionY * 0.18;
  camera.lookAt(lookTarget);
  state.cameraDistance = camera.position.distanceTo(cart.position);

  sun.position.x = cart.position.x - 42;
  sun.position.z = cart.position.z - 25;
  sun.target.position.copy(cart.position);
  scene.add(sun.target);
}

function updateMovementDebug(delta) {
  state.movementDebugTimer -= delta;
  if (state.movementDebugTimer > 0) return;
  state.movementDebugTimer = 0.1;

  movementDebug.speedLevel.textContent =
    `${controls.speedLevel} · ${controls.getSpeedMode()}`;
  movementDebug.targetSpeed.textContent =
    `${(controls.getTargetSpeed() * 3.6).toFixed(1)} km/h`;
  movementDebug.actualSpeed.textContent =
    `${(Math.abs(state.speed) * 3.6).toFixed(1)} km/h`;
  movementDebug.acceleration.textContent =
    `${state.acceleration.toFixed(2)} m/s²`;
  movementDebug.suspension.textContent =
    `${(animationParts.suspensionY * 100).toFixed(1)} cm`;
  movementDebug.cameraDistance.textContent =
    `${state.cameraDistance.toFixed(1)} m`;
  movementDebug.ropeTension.textContent =
    `${Math.round(animationParts.ropeRein.ropeTension * 100)}%`;
  movementDebug.reinTension.textContent =
    `${Math.round(animationParts.ropeRein.reinTension * 100)}%`;
  movementDebug.driverInput.textContent =
    animationParts.ropeRein.driverInputState;
  movementDebug.cargoStability.textContent =
    `${Math.round(cargoPhysics.stability.stability)}% · ${cargoPhysics.stability.status.toUpperCase()}`;
  movementDebug.cargoDamage.textContent =
    `${cargoPhysics.stability.damage.toFixed(1)}%`;
  movementDebug.cargoType.textContent =
    CARGO_TYPES[state.mission.cargoType].label;
  movementDebug.cargoSuspension.textContent =
    cargoPhysics.stability.suspensionForce.toFixed(2);
  movementDebug.cargoTurn.textContent =
    cargoPhysics.stability.turnStrength.toFixed(2);
  movementDebug.cargoRoughness.textContent =
    cargoPhysics.stability.roadRoughness.toFixed(2);
  movementDebug.cargoOffset.textContent =
    `${cargoPhysics.animation.offsetX.toFixed(2)}, ${cargoPhysics.animation.offsetY.toFixed(2)}`;
  movementDebug.activeNPCs.textContent = String(villageLife.debug.activeNPCs);
  movementDebug.activeAnimals.textContent = String(villageLife.debug.activeAnimals);
  movementDebug.spawnedObjects.textContent = String(villageLife.debug.spawnedObjects);
  movementDebug.poolUsage.textContent =
    `${Math.round(villageLife.debug.poolUsage * 100)}%`;
  movementDebug.ambientEvent.textContent = villageLife.debug.currentAmbientEvent;
  movementDebug.averageNPCUpdate.textContent =
    `${villageLife.debug.averageNPCUpdateTime.toFixed(2)} ms`;
  movementDebug.currentChunk.textContent =
    `${worldGenerator.debug.currentChunk} · ${worldGenerator.debug.roadLayout}`;
  movementDebug.loadedChunks.textContent =
    String(worldGenerator.debug.loadedChunks);
  movementDebug.chunkPoolSize.textContent =
    String(worldGenerator.debug.chunkPoolSize);
  movementDebug.currentTheme.textContent =
    worldGenerator.debug.currentTheme;
  movementDebug.currentVillage.textContent =
    worldGenerator.debug.currentVillage;
  movementDebug.landmark.textContent =
    worldGenerator.debug.landmark;
  movementDebug.objectsSpawned.textContent =
    String(worldGenerator.debug.objectsSpawned);
  movementDebug.lodLevel.textContent =
    `LOD ${worldGenerator.debug.lodLevel}`;
  movementDebug.drawCalls.textContent =
    String(worldGenerator.debug.drawCalls);
  movementDebug.fps.textContent =
    worldGenerator.debug.fps.toFixed(0);
}

function updateHud() {
  const remaining = Math.max(0, state.mission.distance - state.progress);
  distanceLabel.textContent = state.distance < 1000
    ? `${Math.floor(state.distance)} m`
    : `${(state.distance / 1000).toFixed(2)} km`;
  remainingDistanceLabel.textContent = `${Math.ceil(remaining)} m`;
  objectiveLabel.textContent = state.journeyStatus === "reached"
    ? "Village reached"
    : `Village: ${Math.ceil(remaining)} m remaining`;
  const progressBucket = Math.floor(state.progress * 2);
  if (progressBucket !== state.hudProgressBucket) {
    state.hudProgressBucket = progressBucket;
    journeyProgressFill.style.transform = `scaleX(${state.progress / state.mission.distance})`;
  }
  missionNameLabel.textContent = state.mission.name;
  missionRewardLabel.textContent = `${state.mission.reward} Coins`;
  missionTimeLabel.textContent = formatMissionTime(state.mission.timeLimit - state.elapsed);
  const stabilityRounded = Math.round(cargoPhysics.stability.stability);
  if (stabilityRounded !== state.stabilityHudBucket) {
    state.stabilityHudBucket = stabilityRounded;
    cargoStabilityValue.textContent = `${stabilityRounded}%`;
    cargoStabilityFill.style.transform = `scaleX(${stabilityRounded / 100})`;
    cargoStabilityBar.setAttribute("aria-valuenow", String(stabilityRounded));
    missionPanel.dataset.stability = cargoPhysics.stability.status;
  }
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
      acceleration: Number(state.acceleration.toFixed(3)),
      cameraDistance: Number(state.cameraDistance.toFixed(3)),
      mission: state.mission.name,
      cargoType: state.mission.cargoType,
      cargoStability: Number(cargoPhysics.stability.stability.toFixed(2)),
      cargoDamage: Number(cargoPhysics.stability.damage.toFixed(2)),
      cargoStatus: cargoPhysics.stability.status,
      cargoOffset: [
        Number(cargoPhysics.animation.offsetX.toFixed(3)),
        Number(cargoPhysics.animation.offsetY.toFixed(3)),
      ],
      wheelRotation: Number(animationParts.wheels[0].rotation.x.toFixed(3)),
      bullLegs: animationParts.bulls.map((bull) =>
        bull.legs.map((leg) => Number(leg.root.rotation.x.toFixed(3)))
      ),
      suspensionY: Number(animationParts.sprungGroup.position.y.toFixed(3)),
      driverReaction: Number(animationParts.driverReaction.toFixed(3)),
      driverReinReaction: Number(animationParts.driverReinReaction.toFixed(3)),
      ropeTension: Number(animationParts.ropeRein.ropeTension.toFixed(3)),
      reinTension: Number(animationParts.ropeRein.reinTension.toFixed(3)),
      driverInputAnimation: animationParts.ropeRein.driverInputState,
      dustParticles: dustSystem.getActiveCount(),
      audio: audioManager.getDebugState(),
      input: controls.getCombinedState(),
      voiceEnabled: voiceControls.enabled,
      environment: villageLife.counts,
      proceduralWorld: worldGenerator.debug,
      proceduralRoad: {
        roadCenterX: Number(currentRoadSample.centerX.toFixed(3)),
        zone: roadState.zone,
        lateralOffset: Number(roadState.lateralOffset.toFixed(3)),
        absoluteOffset: Number(roadState.absoluteOffset.toFixed(3)),
        roadHeading: Number(state.roadHeading.toFixed(3)),
        cartHeading: Number(state.heading.toFixed(3)),
        roadHeight: Number(currentRoadSample.height.toFixed(4)),
        cartY: Number(cart.position.y.toFixed(4)),
        terrainPitch: Number(state.terrainPitch.toFixed(5)),
        normalizedOffset: Number(roadState.normalizedOffset.toFixed(3)),
        roadHalfWidth: Number(roadState.roadHalfWidth.toFixed(3)),
        shoulderWidth: Number(roadState.shoulderWidth.toFixed(3)),
        distanceBeyondRoad: Number(roadState.distanceBeyondRoad.toFixed(3)),
        isOnRoad: roadState.isOnRoad,
        isNearEdge: roadState.isNearEdge,
        isOffRoad: roadState.isOffRoad,
        isFarOffRoad: roadState.isFarOffRoad,
        maximumAllowedLateralOffset: Number(
          roadState.maximumAllowedLateralOffset.toFixed(3),
        ),
        boundaryResistance: Number(roadState.boundaryResistance.toFixed(3)),
        enteredEdge: roadState.enteredEdge,
        enteredOffRoad: roadState.enteredOffRoad,
        enteredFarOffRoad: roadState.enteredFarOffRoad,
        returnedToRoad: roadState.returnedToRoad,
        chunkIndex: currentRoadSample.chunkIndex,
      },
      terrainSurface: {
        surfaceType: surfaceState.type,
        grip: Number(surfaceState.grip.toFixed(3)),
        steeringFactor: Number(surfaceState.steeringFactor.toFixed(3)),
        speedMultiplier: Number(surfaceState.speedMultiplier.toFixed(3)),
        rollingResistance: Number(surfaceState.rollingResistance.toFixed(3)),
        dustFactor: Number(surfaceState.dustFactor.toFixed(3)),
        vibration: Number(surfaceState.vibration.toFixed(3)),
      },
    });
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  state.elapsed += delta;
  if (state.started) updateMovement(delta);
  worldGenerator.update(
    cart.position,
    state.mission.level,
    delta,
    renderer.info.render.calls,
  );
  if (import.meta.env.DEV && !state.started) updateRoadSamples();
  if (import.meta.env.DEV && !state.started) updateRoadState(0, true);
  if (import.meta.env.DEV && !state.started) updateSurfaceState(0, true);
  villageLife.update({
    cartPosition: cart.position,
    cartSpeed: state.speed,
    elapsed: state.elapsed,
    delta,
  });
  updateCamera(delta);
  updateMovementDebug(delta);
  updateHud();
  renderer.render(scene, camera);
  previousPosition.copy(cart.position);
  requestAnimationFrame(animate);
}

function startGame() {
  initializeRoadPose();
  state.started = true;
  state.journeyStatus = "playing";
  cargoPhysics.reset(state.mission.cargoType, state.mission.level);
  controls.resetAll();
  controls.setEnabled(true);
  startScreen.classList.add("is-hidden");
  hud.classList.remove("hidden");
  hint.classList.remove("hidden");
  touchControls.classList.remove("hidden");
  audioManager.start();
  playButton.blur();
  setTimeout(() => hint.classList.add("hidden"), 5600);
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("audiotest")) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", bubbles: true }));
    }, 6500);
  }
}

function replayGame() {
  window.clearTimeout(checkpointTimer);
  state.missionIndex = state.nextMissionIndex;
  state.mission = MISSIONS[state.missionIndex];
  state.nextMissionIndex = (state.missionIndex + 1) % MISSIONS.length;
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
  state.acceleration = 0;
  state.cameraDistance = 0;
  state.movementDebugTimer = 0;
  state.hudProgressBucket = -1;
  state.stabilityHudBucket = -1;
  state.cargoImpact = 0;
  state.cargoCameraFeedback = 0;
  state.lateralOffset = 0;
  state.steeringOffset = 0;
  state.roadHeading = 0;
  state.terrainPitch = 0;
  state.journeyStatus = "playing";
  state.passedCheckpoints.clear();
  cart.position.set(START_X, 0.05, missionStartZ());
  cart.rotation.set(0, 0, 0);
  worldGenerator.reseed();
  worldGenerator.previousPlayerZ = cart.position.z;
  worldGenerator.update(
    cart.position,
    state.mission.level,
    1 / 60,
    renderer.info.render.calls,
  );
  initializeRoadPose();
  previousPosition.copy(cart.position);
  camera.position.set(0, tuning.cameraHeight + 0.8, missionStartZ() - tuning.cameraDistance);
  camera.lookAt(0, 1.4, missionStartZ() + 4.4);
  roadSurface.roughness = 0;
  roadSurface.roll = 0;
  cargoPhysics.reset(state.mission.cargoType, state.mission.level);
  finishScreen.classList.add("is-hidden");
  checkpointMessage.classList.add("hidden");
  touchControls.classList.remove("hidden");
  replayButton.blur();
}

playButton.addEventListener("click", startGame);
replayButton.addEventListener("click", replayGame);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateResponsiveFraming();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(getRenderPixelRatio());
});

document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (event) => event.preventDefault());

window.__bailgadi = {
  getState: () => ({
    started: state.started,
    speed: state.speed,
    distance: state.distance,
    remaining: Math.max(0, state.mission.distance - state.progress),
    journeyStatus: state.journeyStatus,
    mission: state.mission.name,
    cargoType: state.mission.cargoType,
    cargoStability: cargoPhysics.stability.stability,
    cartPosition: cart.position.toArray(),
    cartHeading: state.heading,
    cameraPosition: camera.position.toArray(),
    controls: controls.getCombinedState(),
    voiceEnabled: voiceControls.enabled,
    proceduralRoad: import.meta.env.DEV
      ? {
        roadCenterX: currentRoadSample.centerX,
        zone: roadState.zone,
        lateralOffset: roadState.lateralOffset,
        absoluteOffset: roadState.absoluteOffset,
        roadHeading: state.roadHeading,
        cartHeading: state.heading,
        roadHeight: currentRoadSample.height,
        cartY: cart.position.y,
        terrainPitch: state.terrainPitch,
        normalizedOffset: roadState.normalizedOffset,
        roadHalfWidth: roadState.roadHalfWidth,
        shoulderWidth: roadState.shoulderWidth,
        distanceBeyondRoad: roadState.distanceBeyondRoad,
        isOnRoad: roadState.isOnRoad,
        isNearEdge: roadState.isNearEdge,
        isOffRoad: roadState.isOffRoad,
        isFarOffRoad: roadState.isFarOffRoad,
        maximumAllowedLateralOffset: roadState.maximumAllowedLateralOffset,
        boundaryResistance: roadState.boundaryResistance,
        enteredEdge: roadState.enteredEdge,
        enteredOffRoad: roadState.enteredOffRoad,
        enteredFarOffRoad: roadState.enteredFarOffRoad,
        returnedToRoad: roadState.returnedToRoad,
        chunkIndex: currentRoadSample.chunkIndex,
        roadWidth: currentRoadSample.width,
      }
      : undefined,
    terrainSurface: import.meta.env.DEV
      ? {
        surfaceType: surfaceState.type,
        grip: surfaceState.grip,
        steeringFactor: surfaceState.steeringFactor,
        speedMultiplier: surfaceState.speedMultiplier,
        rollingResistance: surfaceState.rollingResistance,
        dustFactor: surfaceState.dustFactor,
        vibration: surfaceState.vibration,
      }
      : undefined,
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
  if (voiceTest === "model") {
    voiceControls.loadModel()
      .then(() => {
        voiceControls.enabled = true;
        voiceControls.micInputLevel = MIN_INPUT_LEVEL + 1;
        const scores = (background, start, stop) => {
          const values = { "Background Noise": background, START: start, STOP: stop };
          return voiceControls.labels.map((label) => values[label] ?? 0);
        };
        voiceControls.handleScores(scores(0.04, 0.93, 0.03));
        voiceControls.handleScores(scores(0.03, 0.95, 0.02));
        voiceControls.handleScores(scores(0.02, 0.96, 0.02));
        voiceControls.handleScores(scores(0.02, 0.97, 0.01));
        const startMode = controls.getSpeedMode();
        voiceControls.handleScores(scores(0.02, 0.01, 0.97));
        voiceControls.handleScores(scores(0.02, 0.01, 0.97));
        voiceControls.handleScores(scores(0.02, 0.01, 0.97));
        const trailingMode = controls.getSpeedMode();
        setTimeout(() => {
          voiceControls.handleScores(scores(0.95, 0.02, 0.03));
          voiceControls.handleScores(scores(0.03, 0.02, 0.95));
          voiceControls.handleScores(scores(0.02, 0.02, 0.96));
          voiceControls.handleScores(scores(0.01, 0.01, 0.98));
          document.body.dataset.voiceModelTest = JSON.stringify({
            labels: voiceControls.labels,
            startMode,
            trailingMode,
            stopMode: controls.getSpeedMode(),
            lastDetected: voiceLastDetected.textContent,
          });
          voiceControls.enabled = false;
        }, COOLDOWN_MS + 100);
      })
      .catch((error) => {
        document.body.dataset.voiceModelTest = JSON.stringify({
          error: error?.message || String(error),
        });
      });
  } else {
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
}
