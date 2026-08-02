import * as THREE from "three";
import "./style.css";
import { AudioManager } from "./audio-manager.js";
import {
  BULL_GUIDANCE_STATES,
  DRIVER_DIRECTIONS,
  clearPlayerGuidance,
  createBullGuidanceState,
  resetBullGuidanceState,
  setBullGuidanceState,
} from "./bull-guidance.js";
import { CargoPhysicsManager, CARGO_TYPES } from "./cargo-physics-manager.js";
import { Controls, MAX_CART_SPEED, MAX_REVERSE_SPEED } from "./controls.js";
import {
  animateCart,
  createBullockCart,
  reactDriver,
  resetCartAnimation,
  setCartGuidanceFeedback,
  triggerCartBump,
} from "./cart.js";
import { DustSystem } from "./dust-system.js";
import {
  MAX_ROUTE_JUNCTIONS,
  SURFACE_DIRT,
  SURFACE_GRASS,
  SURFACE_GRAVEL,
  SURFACE_MUD,
  SURFACE_ROAD,
  applyRouteSegmentToSample,
  routeSegmentOffsetAt,
  routeSegmentWidthAt,
} from "./procedural-world.js";
import { createRoadGameplay } from "./road-gameplay.js";
import { COOLDOWN_MS, MIN_INPUT_LEVEL, VoiceControls } from "./voice-controls.js";
import {
  applyVillageProgress,
  discoverVillage,
  ensureVillageProgress,
  loadVillageProgress,
  recordVillageDelivery,
  saveVillageProgress,
  villageProgressSummary,
} from "./village-progress.js";
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
const WORLD_SAFETY_HALF_WIDTH = 125;
const WORLD_SAFETY_SOFT_ZONE = 10;
const DESTINATION_ROUTE_TOLERANCE = 10;
const DESTINATION_LATERAL_TOLERANCE_MIN = 5;
const DELIVERY_STOP_SPEED = 0.12;
const DELIVERY_SCENERY_CLEARANCE = 8;
const ROUTE_CHOICE_DISTANCE = 6;
const JUNCTION_APPROACH_DISTANCE = 34;
const BRANCH_COMMIT_DISTANCE = 20;
const BRANCH_COMMIT_MAX_DISTANCE = 30;
const BRANCH_COMMIT_HEADING_LIMIT = THREE.MathUtils.degToRad(68);
const JUNCTION_DIRECTION_THRESHOLD_DEGREES = 20;
const VEHICLE_HALF_WIDTH = 2.25;
const ROAD_FOOTPRINT_SAFETY_MARGIN = 0.2;
const ROAD_SAFE_ZONE_RATIO = 0.68;
const ROAD_HEADING_DEAD_ZONE = THREE.MathUtils.degToRad(6);
const ROAD_EDGE_CORRECTION_ANGLE = THREE.MathUtils.degToRad(10);
const ROAD_OUTSIDE_CORRECTION_ANGLE = THREE.MathUtils.degToRad(22);
const ROAD_LOOKAHEAD_SLOW = 10;
const ROAD_LOOKAHEAD_FAST = 24;
const ROAD_TANGENT_NOISE_THRESHOLD = THREE.MathUtils.degToRad(1.25);
const ROAD_TANGENT_SMOOTHING = 1.35;
const ROAD_CURVE_MAX_CORRECTION_ANGLE = THREE.MathUtils.degToRad(12);
const ROAD_AUTO_CORRECTION_RATE = THREE.MathUtils.degToRad(7);
const ROAD_EDGE_CORRECTION_RATE = THREE.MathUtils.degToRad(10);
const ROAD_OUTSIDE_CORRECTION_RATE = THREE.MathUtils.degToRad(15);
const ROAD_CORRECTION_RESPONSE = 1.4;
const ROAD_CORRECTION_REVERSE_DELAY = 0.55;
const PLAYER_GUIDANCE_DURATION = 2.25;
const BLOCKED_LOOKAHEAD_MIN = 7;
const BLOCKED_LOOKAHEAD_MAX = 15;
const ROUTE_END_STOP_MARGIN = 9;
const JUNCTION_SAFE_SPEED = 10 / 3.6;
const DIRECTION_ASK_RANGE = 12.5;
const DIRECTION_DIALOGUE_DURATION = 5.5;
const DIRECTION_GUIDANCE_DURATION = 7;
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
const DESTINATION_VILLAGES = Object.freeze([
  Object.freeze({ id: "rampur", name: "Rampur" }),
  Object.freeze({ id: "devpura", name: "Devpura" }),
  Object.freeze({ id: "nandgaon", name: "Nandgaon" }),
  Object.freeze({ id: "kheda", name: "Kheda" }),
  Object.freeze({ id: "shivpura", name: "Shivpura" }),
  Object.freeze({ id: "chandpur", name: "Chandpur" }),
]);
const MISSIONS = Object.freeze([
  Object.freeze({
    name: "Rice Delivery",
    cargoType: "rice",
    reward: 120,
    distance: 500,
    timeLimit: 240,
    roadRoughness: 1,
    level: 1,
    destinationVillageId: "rampur",
    destinationVillageName: "Rampur",
  }),
  Object.freeze({
    name: "Morning Milk Run",
    cargoType: "milk",
    reward: 155,
    distance: 530,
    timeLimit: 255,
    roadRoughness: 1.08,
    level: 2,
    destinationVillageId: "devpura",
    destinationVillageName: "Devpura",
  }),
  Object.freeze({
    name: "Market Vegetables",
    cargoType: "vegetables",
    reward: 185,
    distance: 555,
    timeLimit: 270,
    roadRoughness: 1.15,
    level: 3,
    destinationVillageId: "nandgaon",
    destinationVillageName: "Nandgaon",
  }),
  Object.freeze({
    name: "Timber Haul",
    cargoType: "wood",
    reward: 220,
    distance: 585,
    timeLimit: 285,
    roadRoughness: 1.23,
    level: 4,
    destinationVillageId: "kheda",
    destinationVillageName: "Kheda",
  }),
  Object.freeze({
    name: "Clay Pot Delivery",
    cargoType: "clay",
    reward: 280,
    distance: 620,
    timeLimit: 300,
    roadRoughness: 1.32,
    level: 5,
    destinationVillageId: "shivpura",
    destinationVillageName: "Shivpura",
  }),
]);
const villageProgressStore = loadVillageProgress();

const root = document.querySelector("#canvas-root");
const startScreen = document.querySelector("#start-screen");
const finishScreen = document.querySelector("#finish-screen");
const playButton = document.querySelector("#play-button");
const replayButton = document.querySelector("#replay-button");
const menuButton = document.querySelector("#menu-button");
const pauseMenu = document.querySelector("#pause-menu");
const resumeButton = document.querySelector("#resume-button");
const villageInfoList = document.querySelector("#village-info-list");
const villagesDiscovered = document.querySelector("#villages-discovered");
const villagesDeliveries = document.querySelector("#villages-deliveries");
const villagesBestReward = document.querySelector("#villages-best-reward");
const villagesCompletion = document.querySelector("#villages-completion");
const hud = document.querySelector("#hud");
const hint = document.querySelector("#hint");
const touchControls = document.querySelector("#touch-controls");
const distanceLabel = document.querySelector("#distance");
const destinationGuidanceLabel = document.querySelector(
  "#destination-guidance-label",
);
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
const villageWelcome = document.querySelector("#village-welcome");
const villageWelcomeKicker = document.querySelector("#village-welcome-kicker");
const villageWelcomeName = document.querySelector("#village-welcome-name");
const villageWelcomeKnown = document.querySelector("#village-welcome-known");
const villageWelcomeReputation = document.querySelector(
  "#village-welcome-reputation",
);
const askDirectionButton = document.querySelector("#ask-direction-button");
const deliveryInteractionButton = document.querySelector("#delivery-interaction-button");
const directionDialogueElement = document.querySelector("#direction-dialogue");
const directionDriverLine = document.querySelector("#direction-driver-line");
const directionVillagerLine = document.querySelector("#direction-villager-line");
const directionGuidance = document.querySelector("#direction-guidance");
const voiceButton = document.querySelector("#voice-button");
const voiceLabel = document.querySelector("#voice-label");
const voiceMessage = document.querySelector("#voice-message");
const voiceDebugPanel = document.querySelector("#voice-debug");
const voiceLastDetected = document.querySelector("#voice-last-detected");
const soundButton = document.querySelector("#sound-button");
const finishEyebrow = document.querySelector(".finish-card .eyebrow");
const finishTitle = document.querySelector("#finish-title");
const finishCopy = document.querySelector(".finish-copy");
const finishDetails = document.querySelector("#finish-details");
const finishVillage = document.querySelector("#finish-village");
const finishReward = document.querySelector("#finish-reward");
const finishTime = document.querySelector("#finish-time");
const finishCargoCondition = document.querySelector("#finish-cargo-condition");
const finishReputation = document.querySelector("#finish-reputation");
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
  activeVillageName: document.querySelector("#village-debug-name"),
  activeVillageVillagers: document.querySelector("#village-debug-villagers"),
  activeVillageAnimals: document.querySelector("#village-debug-animals"),
  deliveryAvailable: document.querySelector("#village-debug-delivery-available"),
  deliveryCompleted: document.querySelector("#village-debug-delivery-completed"),
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 155);
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
  generateEventDescriptors,
  generateHazardDescriptors,
  generateRouteNetwork,
  configureJunctionRoads,
  checkWaterAhead,
  generateVillage,
  getRoutePosition,
  sampleRouteDistance: sampleBaseRouteDistance,
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
    if (direction === "forward") acceptForwardCommand();
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
const guidanceRoadSample = {};
const aheadRoadPosition = { x: 0, z: 0 };
const behindRoadPosition = { x: 0, z: 0 };
const candidateRoadPosition = { x: 0, z: 0 };
const missionRouteSample = {};
const candidateBranchSample = {};
const junctionIncomingSample = {};
const junctionOutgoingSample = {};
const forwardSafety = {
  obstacleAhead: false,
  blocked: false,
  smallObstacle: false,
  side: 0,
  distance: Number.POSITIVE_INFINITY,
  reason: "None",
};
const junctionDescriptors = new Array(MAX_ROUTE_JUNCTIONS);
for (let index = 0; index < junctionDescriptors.length; index += 1) {
  junctionDescriptors[index] = {
    id: "None",
    type: "three-way",
    routeDistance: 0,
    incomingRouteId: "None",
    outgoingRoutes: [],
    junctionType: "None",
    leftRouteId: "None",
    rightRouteId: "None",
    straightRouteId: "None",
    correctOutgoingRouteId: "None",
    correctDirection: "STRAIGHT",
    destinationVillageName: "None",
    villagerSpawnRouteDistance: 0,
    wrongVillagerSpawnRouteDistance: 0,
    chunkIndex: 0,
    active: false,
  };
}
const missionRouteNetwork = {
  destinationVillageName: MISSIONS[0].destinationVillageName,
  startRouteId: "route-0-start",
  correctRouteIds: new Array(MAX_ROUTE_JUNCTIONS + 1),
  destinationRouteId: "route-0-start",
  junctionCount: 0,
  junctions: junctionDescriptors,
};
const checkpointMarkerStates = [
  {
    remainingDistance: CHECKPOINTS[0],
    routeDistance: 0,
    worldPosition: { x: 0, y: 0, z: 0 },
    triggered: false,
  },
  {
    remainingDistance: CHECKPOINTS[1],
    routeDistance: 0,
    worldPosition: { x: 0, y: 0, z: 0 },
    triggered: false,
  },
  {
    remainingDistance: CHECKPOINTS[2],
    routeDistance: 0,
    worldPosition: { x: 0, y: 0, z: 0 },
    triggered: false,
  },
  {
    remainingDistance: CHECKPOINTS[3],
    routeDistance: 0,
    worldPosition: { x: 0, y: 0, z: 0 },
    triggered: false,
  },
];
const missionMarkerState = {
  destinationRouteDistance: 0,
  destinationWorldPosition: { x: 0, y: 0, z: 0 },
  destinationNormalX: 1,
  destinationNormalZ: 0,
  nextCheckpointIndex: 0,
  nextCheckpointWorldPosition: { x: 0, y: 0, z: 0 },
  nextCheckpointTriggered: false,
  checkpoints: checkpointMarkerStates,
};
const villageDescriptor = {
  id: "None",
  name: MISSIONS[0].destinationVillageName,
  routeDistance: 0,
  theme: "None",
  size: 0,
  population: 0,
  populationBreakdown: {},
  entrance: { routeDistance: 0, label: "" },
  square: { routeDistance: 0, radius: 0 },
  deliveryPoint: {
    id: "None",
    type: "None",
    routeDistance: 0,
    lateralOffset: 0,
  },
  landmark: "None",
  activityZones: [],
  decorationCounts: {},
  seed: 0,
};
const villageState = {
  villageName: villageDescriptor.name,
  villageId: villageDescriptor.id,
  villagePopulation: 0,
  deliveryPoint: villageDescriptor.deliveryPoint,
  distanceToVillage: 0,
  enteringShown: false,
  reachedShown: false,
  activeVillageName: "None",
  activeVillagerCount: 0,
  activeAnimalCount: 0,
};
const deliveryState = {
  destinationRouteId: "None",
  deliveryRouteDistance: 0,
  currentRouteId: "None",
  routeDistanceDifference: Number.POSITIVE_INFINITY,
  lateralDistance: Number.POSITIVE_INFINITY,
  withinDeliveryZone: false,
  insideDestinationVillage: false,
  cartStopped: false,
  markerVisible: false,
  deliveryInteractionAvailable: false,
  completionEligible: false,
  completed: false,
};
const routeState = {
  currentRouteDistance: 0,
  startRouteDistance: 0,
  targetRouteDistance: 0,
  requiredRouteDistance: MISSIONS[0].distance,
  travelledRouteDistance: 0,
  remainingRouteDistance: MISSIONS[0].distance,
  missionProgressRatio: 0,
  nextCheckpointRouteDistance: 0,
  chunkIndex: 0,
  localDistance: 0,
};
const hazardState = {
  hazardCount: 0,
  nextHazardDistance: -1,
  nextHazardType: "None",
  nextHazardLane: "None",
  nearestHazardRouteDistance: -1,
  hazardSeed: 0,
};
const eventState = {
  eventCount: 0,
  nextEventDistance: -1,
  nextEventType: "None",
  nearestEvent: -1,
  eventSeed: 0,
};
const navigationState = {
  destinationVillageId: MISSIONS[0].destinationVillageId,
  destinationVillageName: MISSIONS[0].destinationVillageName,
  currentRouteId: "route-0-start",
  correctRouteId: "route-0-start",
  activeJunctionId: "None",
  nearestVillagerId: "None",
  nearestDirectionVillagerId: "None",
  canAsk: false,
  canAskDirection: false,
  isOnWrongRoute: false,
  lastAskedJunctionId: "None",
  guidanceDirection: "NONE",
  guidanceTimeRemaining: 0,
  dialogueActive: false,
  dialogueTimeRemaining: 0,
  lastDirectionGiven: "None",
  nextJunctionRouteDistance: -1,
  currentJunctionIndex: -1,
  selectedJunctionId: "None",
  branchDirection: "STRAIGHT",
  branchJunctionRouteDistance: 0,
  physicalRouteDistance: 0,
  wrongRouteTravelDistance: 0,
  lastPhysicalRouteDistance: 0,
  askUiVisible: false,
  junctionId: "None",
  incomingRouteId: "None",
  availableOutgoingRouteIds: [],
  correctOutgoingRouteId: "None",
  selectedOutgoingRouteId: "None",
  candidateRouteId: "None",
  branchCommitted: false,
  branchSeparationDistance: 0,
  distanceFromJunction: Number.POSITIVE_INFINITY,
  branchCommitProgress: 0,
};
const bullGuidanceState = createBullGuidanceState(
  missionRouteNetwork.startRouteId,
);
const driverDirectionDialogue = {
  dialogueId: "driver_ask",
  speaker: "driver",
  text: "",
  audioKey: "",
  destinationVillageName: "",
  direction: "NONE",
  isWrongRoute: false,
};
const villagerDirectionDialogue = {
  dialogueId: "villager_direction",
  speaker: "villager",
  text: "",
  audioKey: "",
  destinationVillageName: "",
  direction: "NONE",
  isWrongRoute: false,
};
const directionDialogueState = {
  driver: driverDirectionDialogue,
  villager: villagerDirectionDialogue,
};
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
  paused: false,
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
  missionHudIndex: -1,
  stabilityHudBucket: -1,
  cargoImpact: 0,
  cargoCameraFeedback: 0,
  lateralOffset: 0,
  steeringOffset: 0,
  steeringVelocity: 0,
  roadHeading: 0,
  headingAssistAmount: 0,
  autoSteerAmount: 0,
  lateralRecenteringForce: 0,
  stableRoadHeading: 0,
  stableRoadHeadingReady: false,
  rawRoadHeading: 0,
  correctionDirection: 0,
  correctionDirectionAge: 0,
  previousSteerInput: 0,
  terrainPitch: 0,
  missionIndex: 0,
  nextMissionIndex: 1,
  mission: MISSIONS[0],
  journeyStatus: "ready",
  passedCheckpoints: new Set(),
};
let checkpointTimer = 0;
let villageWelcomeTimer = 0;

const tuning = {
  maxForward: MAX_CART_SPEED,
  acceleration: 1.45,
  braking: 1.8,
  speedResponse: 0.92,
  accelerationResponse: 2.4,
  brakingResponse: 3.1,
  steeringRateLowSpeed: 0.42,
  steeringRateHighSpeed: 0.2,
  steeringResponse: 1.75,
  steeringRelease: 1.25,
  terrainHeightResponse: 5.5,
  terrainPitchResponse: 4.2,
  terrainSampleDistance: 4.5,
  cameraDistance: 11.8,
  cameraSpeedPullback: 2,
  cameraHeight: 5.75,
};

function updateResponsiveFraming() {
  const isMobile = window.innerWidth <= 800;
  const isPortrait = window.innerHeight > window.innerWidth;
  tuning.cameraDistance = isMobile ? (isPortrait ? 13.1 : 12.2) : 11.8;
  tuning.cameraHeight = isMobile ? (isPortrait ? 6.45 : 6.05) : 5.75;
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

function routeDirectionForId(descriptor, routeId) {
  for (let index = 0; index < descriptor.outgoingRoutes.length; index += 1) {
    if (descriptor.outgoingRoutes[index].id === routeId) {
      return descriptor.outgoingRoutes[index].direction;
    }
  }
  return "NONE";
}

function routeIdForDirection(descriptor, direction) {
  for (let index = 0; index < descriptor.outgoingRoutes.length; index += 1) {
    if (descriptor.outgoingRoutes[index].direction === direction) {
      return descriptor.outgoingRoutes[index].id;
    }
  }
  return "None";
}

function routeSegmentForId(routeId) {
  for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
    const routes = junctionDescriptors[index].outgoingRoutes;
    for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
      if (routes[routeIndex].id === routeId) return routes[routeIndex];
    }
  }
  return null;
}

function classifyJunctions() {
  for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
    const junction = junctionDescriptors[index];
    sampleBaseRouteDistance(
      junction.routeDistance - 4,
      state.mission.level,
      junctionIncomingSample,
    );
    const incomingRoute = routeSegmentForId(junction.incomingRouteId);
    if (incomingRoute) {
      applyRouteSegmentToSample(
        junction.routeDistance - 4,
        incomingRoute,
        junctionIncomingSample,
      );
    }
    const incomingHeading = Math.atan2(
      junctionIncomingSample.tangentX,
      junctionIncomingSample.tangentZ,
    );
    junction.leftRouteId = "None";
    junction.rightRouteId = "None";
    junction.straightRouteId = "None";
    for (let routeIndex = 0; routeIndex < junction.outgoingRoutes.length; routeIndex += 1) {
      const route = junction.outgoingRoutes[routeIndex];
      sampleBaseRouteDistance(
        junction.routeDistance + 14,
        state.mission.level,
        junctionOutgoingSample,
      );
      applyRouteSegmentToSample(
        junction.routeDistance + 14,
        route,
        junctionOutgoingSample,
      );
      const outgoingHeading = Math.atan2(
        junctionOutgoingSample.tangentX,
        junctionOutgoingSample.tangentZ,
      );
      const relativeAngleDegrees = -THREE.MathUtils.radToDeg(
        wrappedAngleDelta(incomingHeading, outgoingHeading),
      );
      route.relativeAngleDegrees = relativeAngleDegrees;
      route.alignmentScore = Math.max(0, 1 - Math.abs(relativeAngleDegrees) / 90);
      if (Math.abs(relativeAngleDegrees) <= JUNCTION_DIRECTION_THRESHOLD_DEGREES) {
        route.direction = DRIVER_DIRECTIONS.STRAIGHT;
        junction.straightRouteId = route.id;
      } else if (relativeAngleDegrees < 0) {
        route.direction = DRIVER_DIRECTIONS.LEFT;
        junction.leftRouteId = route.id;
      } else {
        route.direction = DRIVER_DIRECTIONS.RIGHT;
        junction.rightRouteId = route.id;
      }
    }
    const hasLeft = junction.leftRouteId !== "None";
    const hasRight = junction.rightRouteId !== "None";
    const hasStraight = junction.straightRouteId !== "None";
    if (junction.outgoingRoutes.length === 0) junction.junctionType = "DEAD_END";
    else if (junction.outgoingRoutes.length === 1 && hasStraight) {
      junction.junctionType = "STRAIGHT_ONLY";
    } else if (!hasStraight && hasLeft && hasRight) {
      junction.junctionType = "T_JUNCTION";
    } else if (junction.outgoingRoutes.length >= 3 && hasStraight) {
      junction.junctionType = "THREE_WAY";
    } else {
      junction.junctionType = "TWO_WAY_FORK";
    }
  }
}

function correctRouteIdAtDistance(routeDistance) {
  let routeId = missionRouteNetwork.startRouteId;
  for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
    const descriptor = junctionDescriptors[index];
    if (routeDistance < descriptor.routeDistance) break;
    routeId = descriptor.correctOutgoingRouteId;
  }
  return routeId;
}

function sampleRouteDistance(routeDistance, difficulty, target) {
  sampleBaseRouteDistance(routeDistance, difficulty, target);
  const routeId = correctRouteIdAtDistance(routeDistance);
  const route = routeSegmentForId(routeId);
  if (route) {
    applyRouteSegmentToSample(routeDistance, route, target);
  }
  return target;
}

function sampleBranchCandidate(route, physicalRouteDistance) {
  sampleBaseRouteDistance(
    physicalRouteDistance,
    state.mission.level,
    candidateBranchSample,
  );
  applyRouteSegmentToSample(
    physicalRouteDistance,
    route,
    candidateBranchSample,
    cart.position.x,
  );
}

function deterministicBranchTie(junctionId, routeId) {
  let value = worldGenerator.seed >>> 0;
  for (let index = 0; index < junctionId.length; index += 1) {
    value = Math.imul(value ^ junctionId.charCodeAt(index), 16777619) >>> 0;
  }
  for (let index = 0; index < routeId.length; index += 1) {
    value = Math.imul(value ^ routeId.charCodeAt(index), 16777619) >>> 0;
  }
  return value / 4294967295;
}

function naturalBranchRouteId(junction, physicalRouteDistance) {
  void physicalRouteDistance;
  if (junction.outgoingRoutes.length === 0) return "None";
  if (
    junction.junctionType === "THREE_WAY"
    && junction.straightRouteId !== "None"
  ) return junction.straightRouteId;
  if (junction.junctionType === "STRAIGHT_ONLY") {
    return junction.straightRouteId;
  }
  const choice = Math.floor(
    deterministicBranchTie(junction.id, "natural-choice")
      * junction.outgoingRoutes.length,
  );
  return junction.outgoingRoutes[
    Math.min(choice, junction.outgoingRoutes.length - 1)
  ].id;
}

function updateNavigationRouteChoice(physicalRouteDistance) {
  navigationState.physicalRouteDistance = physicalRouteDistance;
  navigationState.nextJunctionRouteDistance = -1;
  let nearbyJunctionIndex = -1;
  let candidateRouteId = "None";

  for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
    const junction = junctionDescriptors[index];
    const delta = physicalRouteDistance - junction.routeDistance;
    if (
      navigationState.nextJunctionRouteDistance < 0
      && delta < -ROUTE_CHOICE_DISTANCE
    ) {
      navigationState.nextJunctionRouteDistance = junction.routeDistance;
    }
    if (
      navigationState.currentRouteId === junction.incomingRouteId
      && delta >= -JUNCTION_APPROACH_DISTANCE
      && delta <= BRANCH_COMMIT_MAX_DISTANCE + 8
    ) {
      if (navigationState.selectedJunctionId !== junction.id) {
        navigationState.branchCommitted = false;
      }
      const naturalRouteId = naturalBranchRouteId(junction, physicalRouteDistance);
      bullGuidanceState.naturalBranchChoice = naturalRouteId;
      const rememberedDirection = bullGuidanceState.playerGuidanceActive
        ? bullGuidanceState.playerGuidanceDirection
        : DRIVER_DIRECTIONS.NONE;
      const directedRouteId = rememberedDirection !== DRIVER_DIRECTIONS.NONE
        ? routeIdForDirection(junction, rememberedDirection)
        : "None";
      candidateRouteId = directedRouteId !== "None" ? directedRouteId : naturalRouteId;
      let bestRouteId = "None";
      let bestLateralDistance = Number.POSITIVE_INFINITY;
      let secondLateralDistance = Number.POSITIVE_INFINITY;
      let bestHeadingDifference = Number.POSITIVE_INFINITY;
      let bestWidth = 0;
      for (let routeIndex = 0; routeIndex < junction.outgoingRoutes.length; routeIndex += 1) {
        const route = junction.outgoingRoutes[routeIndex];
        sampleBranchCandidate(route, physicalRouteDistance);
        const dx = cart.position.x - candidateBranchSample.centerX;
        const dz = cart.position.z - candidateBranchSample.centerZ;
        const lateralDistance = Math.abs(
          dx * candidateBranchSample.normalX + dz * candidateBranchSample.normalZ
        );
        const routeHeading = Math.atan2(
          candidateBranchSample.tangentX,
          candidateBranchSample.tangentZ,
        );
        const headingDifference = Math.abs(wrappedAngleDelta(state.heading, routeHeading));
        if (lateralDistance < bestLateralDistance) {
          secondLateralDistance = bestLateralDistance;
          bestLateralDistance = lateralDistance;
          bestHeadingDifference = headingDifference;
          bestWidth = candidateBranchSample.width || 6;
          bestRouteId = route.id;
        } else if (lateralDistance < secondLateralDistance) {
          secondLateralDistance = lateralDistance;
        }
      }
      if (delta >= BRANCH_COMMIT_DISTANCE && bestRouteId !== "None") {
        const captureWidth = Math.max(0.25, bestWidth * 0.5);
        const footprintMostlyInside = (
          bestLateralDistance
          + VEHICLE_HALF_WIDTH * 0.65
          + ROAD_FOOTPRINT_SAFETY_MARGIN
          <= captureWidth
        );
        const clearlyOnBranch = (
          bestLateralDistance <= captureWidth
          && bestLateralDistance + 0.75 < secondLateralDistance
          && bestHeadingDifference <= BRANCH_COMMIT_HEADING_LIMIT
          && footprintMostlyInside
        );
        if (clearlyOnBranch) {
          const chosenRouteId = bestRouteId;
          navigationState.currentRouteId = chosenRouteId;
          navigationState.correctRouteId = junction.correctOutgoingRouteId;
          navigationState.selectedJunctionId = junction.id;
          navigationState.currentJunctionIndex = index;
          navigationState.branchDirection = routeDirectionForId(junction, chosenRouteId);
          navigationState.branchJunctionRouteDistance = junction.routeDistance;
          navigationState.isOnWrongRoute = (
            chosenRouteId !== junction.correctOutgoingRouteId
          );
          navigationState.branchCommitted = true;
          bullGuidanceState.committedRouteId = chosenRouteId;
          clearPlayerGuidance(bullGuidanceState);
          setBullGuidanceState(
            bullGuidanceState,
            BULL_GUIDANCE_STATES.COMMITTED_TO_BRANCH,
          );
        }
      }
      nearbyJunctionIndex = index;
    } else if (
      routeDirectionForId(junction, navigationState.currentRouteId) !== "NONE"
    ) {
      navigationState.correctRouteId = junction.correctOutgoingRouteId;
      const currentBranch = routeSegmentForId(navigationState.currentRouteId);
      let reverseAligned = false;
      if (currentBranch && delta < -4) {
        sampleBranchCandidate(currentBranch, physicalRouteDistance);
        const reverseBranchHeading = Math.atan2(
          -candidateBranchSample.tangentX,
          -candidateBranchSample.tangentZ,
        );
        reverseAligned = Math.abs(
          wrappedAngleDelta(state.heading, reverseBranchHeading),
        ) <= THREE.MathUtils.degToRad(35);
      }
      if (delta < -8 && reverseAligned) {
        navigationState.currentRouteId = junction.incomingRouteId;
        navigationState.correctRouteId = junction.incomingRouteId;
        navigationState.selectedJunctionId = "None";
        navigationState.currentJunctionIndex = -1;
        navigationState.branchDirection = "STRAIGHT";
        navigationState.isOnWrongRoute = false;
        navigationState.branchCommitted = false;
        navigationState.candidateRouteId = "None";
      }
    }
    if (Math.abs(delta) <= 58) nearbyJunctionIndex = index;
  }

  navigationState.candidateRouteId = candidateRouteId;
  bullGuidanceState.currentRouteId = navigationState.currentRouteId;
  bullGuidanceState.candidateRouteId = candidateRouteId;

  navigationState.activeJunctionId = nearbyJunctionIndex >= 0
    ? junctionDescriptors[nearbyJunctionIndex].id
    : "None";
  const debugJunction = nearbyJunctionIndex >= 0
    ? junctionDescriptors[nearbyJunctionIndex]
    : navigationState.currentJunctionIndex >= 0
      ? junctionDescriptors[navigationState.currentJunctionIndex]
      : null;
  navigationState.junctionId = debugJunction?.id || "None";
  navigationState.incomingRouteId = debugJunction?.incomingRouteId || "None";
  navigationState.availableOutgoingRouteIds.length = debugJunction
    ? debugJunction.outgoingRoutes.length
    : 0;
  if (debugJunction) {
    for (let index = 0; index < debugJunction.outgoingRoutes.length; index += 1) {
      navigationState.availableOutgoingRouteIds[index] =
        debugJunction.outgoingRoutes[index].id;
    }
  }
  navigationState.correctOutgoingRouteId = (
    debugJunction?.correctOutgoingRouteId || "None"
  );
  navigationState.selectedOutgoingRouteId = (
    navigationState.selectedJunctionId === debugJunction?.id
      ? navigationState.currentRouteId
      : "None"
  );
  navigationState.branchSeparationDistance = (
    debugJunction?.branchSeparationDistance || 0
  );
  navigationState.distanceFromJunction = debugJunction
    ? physicalRouteDistance - debugJunction.routeDistance
    : Number.POSITIVE_INFINITY;
  bullGuidanceState.junctionId = navigationState.junctionId;
  bullGuidanceState.junctionType = debugJunction?.junctionType || "None";
  bullGuidanceState.leftRouteId = debugJunction?.leftRouteId || "None";
  bullGuidanceState.rightRouteId = debugJunction?.rightRouteId || "None";
  bullGuidanceState.straightRouteId = debugJunction?.straightRouteId || "None";
  bullGuidanceState.availableOutgoingRouteIds.length = (
    navigationState.availableOutgoingRouteIds.length
  );
  for (let index = 0; index < navigationState.availableOutgoingRouteIds.length; index += 1) {
    bullGuidanceState.availableOutgoingRouteIds[index] = (
      navigationState.availableOutgoingRouteIds[index]
    );
  }
  navigationState.branchCommitProgress = debugJunction
    ? THREE.MathUtils.clamp(
      (physicalRouteDistance - debugJunction.routeDistance)
        / BRANCH_COMMIT_DISTANCE,
      0,
      1,
    )
    : 0;
  bullGuidanceState.branchCommitProgress = navigationState.branchCommitProgress;
  bullGuidanceState.isOnWrongRoute = navigationState.isOnWrongRoute;
  if (!bullGuidanceState.obstacleAhead) {
    if (nearbyJunctionIndex >= 0 && navigationState.distanceFromJunction < -ROUTE_CHOICE_DISTANCE) {
      setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.APPROACHING_JUNCTION);
    } else if (candidateRouteId !== "None" && !navigationState.branchCommitted) {
      setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.CHOOSING_BRANCH);
    } else if (Math.abs(state.speed) < 0.03) {
      setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.STOPPED);
    } else {
      setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.FOLLOW_ROAD);
    }
  }
}

function applySharedJunctionSurface(sample, junction) {
  let minimumOffset = Number.POSITIVE_INFINITY;
  let maximumOffset = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < junction.outgoingRoutes.length; index += 1) {
    const route = junction.outgoingRoutes[index];
    const offset = routeSegmentOffsetAt(sample.routeDistance, route);
    const width = routeSegmentWidthAt(sample.routeDistance, route, sample.width);
    minimumOffset = Math.min(minimumOffset, offset - width * 0.5);
    maximumOffset = Math.max(maximumOffset, offset + width * 0.5);
  }
  if (!Number.isFinite(minimumOffset) || !Number.isFinite(maximumOffset)) return;
  const centerOffset = (minimumOffset + maximumOffset) * 0.5;
  sample.centerX += sample.normalX * centerOffset;
  sample.centerZ += sample.normalZ * centerOffset;
  sample.width = maximumOffset - minimumOffset;
  sample.routeId = junction.incomingRouteId;
}

function applyNavigationRouteSample(sample, worldX) {
  let sharedJunction = null;
  if (!navigationState.branchCommitted) {
    for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
      const junction = junctionDescriptors[index];
      const delta = sample.routeDistance - junction.routeDistance;
      if (
        navigationState.currentRouteId === junction.incomingRouteId
        && delta >= -ROUTE_CHOICE_DISTANCE
        && delta < BRANCH_COMMIT_MAX_DISTANCE
      ) {
        sharedJunction = junction;
        break;
      }
    }
  }
  if (sharedJunction) {
    applySharedJunctionSurface(sample, sharedJunction);
    sample.surfaceType = SURFACE_ROAD;
    return sample;
  }
  const activeRouteId = navigationState.currentRouteId;
  const route = routeSegmentForId(activeRouteId);
  if (route) {
    applyRouteSegmentToSample(sample.routeDistance, route, sample, worldX);
  }
  sample.surfaceType = SURFACE_ROAD;
  return sample;
}

// Road following must not see a widened junction or a candidate branch before
// the cart itself reaches the decision zone. This keeps route choice isolated
// from ordinary forward travel while preserving the existing junction rules.
function applyRoadFollowingRouteSample(sample, worldX) {
  const junctionDecisionActive = (
    navigationState.candidateRouteId !== "None"
    && !navigationState.branchCommitted
    && navigationState.distanceFromJunction >= -ROUTE_CHOICE_DISTANCE
  );
  if (junctionDecisionActive) return applyNavigationRouteSample(sample, worldX);
  const route = routeSegmentForId(navigationState.currentRouteId);
  if (route) applyRouteSegmentToSample(sample.routeDistance, route, sample, worldX);
  sample.surfaceType = SURFACE_ROAD;
  return sample;
}

function updateCurrentRoadSample() {
  getRoutePosition(cart.position, state.mission.level, currentRoadSample);
  updateNavigationRouteChoice(currentRoadSample.routeDistance);
  applyNavigationRouteSample(currentRoadSample, cart.position.x);
  state.roadHeading = Math.atan2(
    currentRoadSample.tangentX,
    currentRoadSample.tangentZ,
  );
}

function updateStableRoadHeading(delta, snap = false) {
  const speedRatio = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  const lookAheadDistance = THREE.MathUtils.lerp(
    ROAD_LOOKAHEAD_SLOW,
    ROAD_LOOKAHEAD_FAST,
    speedRatio,
  );
  sampleBaseRouteDistance(
    currentRoadSample.routeDistance + lookAheadDistance,
    state.mission.level,
    guidanceRoadSample,
  );
  applyRoadFollowingRouteSample(guidanceRoadSample, cart.position.x);
  const liveLateralOffset = (
    (cart.position.x - currentRoadSample.centerX) * currentRoadSample.normalX
    + (cart.position.z - currentRoadSample.centerZ) * currentRoadSample.normalZ
  );
  // Aim along the cart's current lane within the corridor. Using the same
  // lateral offset at the look-ahead point follows curves without chasing the
  // mathematical centreline.
  const targetLateralOffset = THREE.MathUtils.clamp(
    liveLateralOffset,
    -Math.max(0, guidanceRoadSample.width * 0.5 - VEHICLE_HALF_WIDTH),
    Math.max(0, guidanceRoadSample.width * 0.5 - VEHICLE_HALF_WIDTH),
  );
  const targetX = guidanceRoadSample.centerX
    + guidanceRoadSample.normalX * targetLateralOffset;
  const targetZ = guidanceRoadSample.centerZ
    + guidanceRoadSample.normalZ * targetLateralOffset;
  const sampledHeading = Math.atan2(targetX - cart.position.x, targetZ - cart.position.z);
  state.rawRoadHeading = sampledHeading;
  bullGuidanceState.rawRoadHeading = sampledHeading;
  if (snap || !state.stableRoadHeadingReady) {
    state.stableRoadHeading = sampledHeading;
    state.stableRoadHeadingReady = true;
    bullGuidanceState.smoothedRoadHeading = sampledHeading;
    return;
  }
  const tangentChange = wrappedAngleDelta(state.stableRoadHeading, sampledHeading);
  if (Math.abs(tangentChange) <= ROAD_TANGENT_NOISE_THRESHOLD) {
    bullGuidanceState.smoothedRoadHeading = state.stableRoadHeading;
    return;
  }
  state.stableRoadHeading = dampAngle(
    state.stableRoadHeading,
    sampledHeading,
    ROAD_TANGENT_SMOOTHING,
    delta,
  );
  bullGuidanceState.smoothedRoadHeading = state.stableRoadHeading;
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
  aheadRoadSample.routeDistance = (
    currentRoadSample.routeDistance + sampleDistance
  );
  applyNavigationRouteSample(aheadRoadSample, aheadRoadPosition.x);
  sampleRoad(behindRoadPosition, state.mission.level, behindRoadSample);
  behindRoadSample.routeDistance = (
    currentRoadSample.routeDistance - sampleDistance
  );
  applyNavigationRouteSample(behindRoadSample, behindRoadPosition.x);
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
  updateStableRoadHeading(0, true);
  state.lateralOffset = (
    (cart.position.x - currentRoadSample.centerX) * currentRoadSample.normalX
    + (cart.position.z - currentRoadSample.centerZ) * currentRoadSample.normalZ
  );
  state.steeringOffset = 0;
  state.steeringVelocity = 0;
  state.heading = state.roadHeading;
  cart.rotation.y = state.heading;
  updateTerrainPose(0, true);
  updateRoadState(0, true);
  updateSurfaceState(0, true);
}

function alignMissionSpawn() {
  sampleBaseRouteDistance(
    routeState.startRouteDistance,
    state.mission.level,
    missionRouteSample,
  );
  cart.position.set(
    missionRouteSample.centerX,
    missionRouteSample.centerY + CART_ROAD_CLEARANCE,
    missionRouteSample.centerZ,
  );
  state.heading = Math.atan2(
    missionRouteSample.tangentX,
    missionRouteSample.tangentZ,
  );
  cart.rotation.y = state.heading;
  navigationState.currentRouteId = missionRouteNetwork.startRouteId;
  navigationState.correctRouteId = missionRouteNetwork.startRouteId;
  bullGuidanceState.currentRouteId = missionRouteNetwork.startRouteId;
  updateRoadSamples();
  state.heading = state.roadHeading;
  cart.rotation.y = state.heading;
  state.lateralOffset = (
    (cart.position.x - currentRoadSample.centerX) * currentRoadSample.normalX
    + (cart.position.z - currentRoadSample.centerZ) * currentRoadSample.normalZ
  );
  updateTerrainPose(0, true);
  updateRoadState(0, true);
  updateSurfaceState(0, true);
  const safeHalfWidth = Math.max(
    0,
    currentRoadSample.width * 0.5
      - VEHICLE_HALF_WIDTH
      - ROAD_FOOTPRINT_SAFETY_MARGIN,
  );
  bullGuidanceState.spawnRouteId = missionRouteNetwork.startRouteId;
  bullGuidanceState.spawnRoadOffset = state.lateralOffset;
  bullGuidanceState.vehicleHalfWidth = VEHICLE_HALF_WIDTH;
  bullGuidanceState.safeRoadHalfWidth = safeHalfWidth;
  bullGuidanceState.spawnValid = (
    Math.abs(state.lateralOffset) <= safeHalfWidth
    && Math.abs(wrappedAngleDelta(state.heading, state.roadHeading))
      <= THREE.MathUtils.degToRad(2)
  );
}

function updateNextCheckpointRouteDistance() {
  routeState.nextCheckpointRouteDistance = routeState.targetRouteDistance;
  missionMarkerState.nextCheckpointIndex = -1;
  missionMarkerState.nextCheckpointTriggered = true;
  missionMarkerState.nextCheckpointWorldPosition.x =
    missionMarkerState.destinationWorldPosition.x;
  missionMarkerState.nextCheckpointWorldPosition.y =
    missionMarkerState.destinationWorldPosition.y;
  missionMarkerState.nextCheckpointWorldPosition.z =
    missionMarkerState.destinationWorldPosition.z;
  for (let index = 0; index < CHECKPOINTS.length; index += 1) {
    const checkpoint = CHECKPOINTS[index];
    if (!state.passedCheckpoints.has(checkpoint)) {
      routeState.nextCheckpointRouteDistance = (
        routeState.targetRouteDistance - checkpoint
      );
      const checkpointState = checkpointMarkerStates[index];
      missionMarkerState.nextCheckpointIndex = index;
      missionMarkerState.nextCheckpointTriggered =
        checkpointState.triggered;
      missionMarkerState.nextCheckpointWorldPosition.x =
        checkpointState.worldPosition.x;
      missionMarkerState.nextCheckpointWorldPosition.y =
        checkpointState.worldPosition.y;
      missionMarkerState.nextCheckpointWorldPosition.z =
        checkpointState.worldPosition.z;
      return;
    }
  }
}

function rebuildMissionRouteMarkers() {
  sampleRouteDistance(
    villageDescriptor.deliveryPoint.routeDistance,
    state.mission.level,
    missionRouteSample,
  );
  roadGameplay.placeDestination(
    missionRouteSample,
    navigationState.destinationVillageName,
    villageDescriptor.deliveryPoint.lateralOffset,
  );
  missionMarkerState.destinationRouteDistance =
    villageDescriptor.deliveryPoint.routeDistance;
  missionMarkerState.destinationWorldPosition.x = (
    missionRouteSample.centerX
    + missionRouteSample.normalX * villageDescriptor.deliveryPoint.lateralOffset
  );
  missionMarkerState.destinationWorldPosition.y = missionRouteSample.centerY;
  missionMarkerState.destinationWorldPosition.z = (
    missionRouteSample.centerZ
    + missionRouteSample.normalZ * villageDescriptor.deliveryPoint.lateralOffset
  );
  missionMarkerState.destinationNormalX = missionRouteSample.normalX;
  missionMarkerState.destinationNormalZ = missionRouteSample.normalZ;
  deliveryState.destinationRouteId = missionRouteNetwork.destinationRouteId;
  deliveryState.deliveryRouteDistance =
    villageDescriptor.deliveryPoint.routeDistance;
  deliveryState.currentRouteId = navigationState.currentRouteId;
  deliveryState.routeDistanceDifference = routeState.requiredRouteDistance;
  deliveryState.lateralDistance = Number.POSITIVE_INFINITY;
  deliveryState.withinDeliveryZone = false;
  deliveryState.insideDestinationVillage = false;
  deliveryState.cartStopped = false;
  deliveryState.markerVisible = false;
  deliveryState.deliveryInteractionAvailable = false;
  deliveryState.completionEligible = false;
  deliveryState.completed = false;
  roadGameplay.setDestinationVisible(false);

  for (let index = 0; index < CHECKPOINTS.length; index += 1) {
    const checkpointState = checkpointMarkerStates[index];
    checkpointState.routeDistance = (
      routeState.targetRouteDistance - CHECKPOINTS[index]
    );
    checkpointState.triggered = false;
    sampleRouteDistance(
      checkpointState.routeDistance,
      state.mission.level,
      missionRouteSample,
    );
    checkpointState.worldPosition.x = missionRouteSample.centerX;
    checkpointState.worldPosition.y = missionRouteSample.centerY;
    checkpointState.worldPosition.z = missionRouteSample.centerZ;
    roadGameplay.placeCheckpoint(index, missionRouteSample);
    roadGameplay.setCheckpointTriggered(index, false);
  }
  updateNextCheckpointRouteDistance();
}

function rebuildVillage() {
  generateVillage(
    routeState.targetRouteDistance,
    state.mission.level,
    state.missionIndex,
    navigationState.destinationVillageName,
    villageDescriptor,
  );
  const villageProgress = ensureVillageProgress(
    villageProgressStore,
    villageDescriptor,
  );
  applyVillageProgress(villageDescriptor, villageProgress);
  roadGameplay.configureVillage(
    villageDescriptor,
    sampleRouteDistance,
    state.mission.level,
  );
  villageState.villageName = villageDescriptor.name;
  villageState.villageId = villageDescriptor.id;
  villageState.villagePopulation = villageDescriptor.population;
  villageState.deliveryPoint = villageDescriptor.deliveryPoint;
  villageState.distanceToVillage = Math.max(
    0,
    villageDescriptor.entrance.routeDistance - routeState.currentRouteDistance,
  );
  villageState.enteringShown = false;
  villageState.reachedShown = false;
  villageState.activeVillageName = "None";
  villageState.activeVillagerCount = 0;
  villageState.activeAnimalCount = 0;
  deliveryInteractionButton.classList.add("hidden");
}

function updateHazardState() {
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nextDistance = Number.POSITIVE_INFINITY;
  let nearestRouteDistance = -1;
  let nextType = "None";
  let nextLane = "None";
  for (let index = 0; index < roadGameplay.hazards.length; index += 1) {
    const hazard = roadGameplay.hazards[index];
    if (!hazard.active) continue;
    const relativeDistance = (
      hazard.routeDistance - routeState.currentRouteDistance
    );
    const absoluteDistance = Math.abs(relativeDistance);
    if (absoluteDistance < nearestDistance) {
      nearestDistance = absoluteDistance;
      nearestRouteDistance = hazard.routeDistance;
    }
    if (relativeDistance >= 0 && relativeDistance < nextDistance) {
      nextDistance = relativeDistance;
      nextType = hazard.type;
      nextLane = hazard.lane;
    }
  }
  hazardState.nextHazardDistance = Number.isFinite(nextDistance)
    ? nextDistance
    : -1;
  hazardState.nextHazardType = nextType;
  hazardState.nextHazardLane = nextLane;
  hazardState.nearestHazardRouteDistance = nearestRouteDistance;
}

function rebuildProceduralHazards() {
  hazardState.hazardCount = generateHazardDescriptors(
    routeState.startRouteDistance,
    routeState.targetRouteDistance,
    state.mission.level,
    checkpointMarkerStates,
    roadGameplay.hazards,
  );
  roadGameplay.configureHazards(
    hazardState.hazardCount,
    sampleRouteDistance,
    state.mission.level,
  );
  hazardState.hazardSeed = worldGenerator.seed;
  updateHazardState();
}

function updateEventState() {
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nextDistance = Number.POSITIVE_INFINITY;
  let nearestRouteDistance = -1;
  let nextType = "None";
  for (let index = 0; index < roadGameplay.events.length; index += 1) {
    const event = roadGameplay.events[index];
    if (!event.active) continue;
    const relativeDistance = (
      event.routeDistance - routeState.currentRouteDistance
    );
    const absoluteDistance = Math.abs(relativeDistance);
    if (absoluteDistance < nearestDistance) {
      nearestDistance = absoluteDistance;
      nearestRouteDistance = event.routeDistance;
    }
    if (relativeDistance >= 0 && relativeDistance < nextDistance) {
      nextDistance = relativeDistance;
      nextType = event.type;
    }
  }
  eventState.nextEventDistance = Number.isFinite(nextDistance)
    ? nextDistance
    : -1;
  eventState.nextEventType = nextType;
  eventState.nearestEvent = nearestRouteDistance;
}

function rebuildProceduralEvents() {
  eventState.eventCount = generateEventDescriptors(
    routeState.startRouteDistance,
    routeState.targetRouteDistance,
    state.mission.level,
    state.missionIndex,
    checkpointMarkerStates,
    roadGameplay.hazards,
    roadGameplay.events,
  );
  roadGameplay.configureEvents(
    eventState.eventCount,
    sampleRouteDistance,
    state.mission.level,
  );
  eventState.eventSeed = worldGenerator.seed;
  updateEventState();
}

function closeDirectionDialogue() {
  navigationState.dialogueActive = false;
  navigationState.dialogueTimeRemaining = 0;
  directionDialogueElement.classList.add("hidden");
}

function resetNavigationState() {
  const destination = DESTINATION_VILLAGES[
    state.missionIndex % DESTINATION_VILLAGES.length
  ];
  navigationState.destinationVillageId = destination.id;
  navigationState.destinationVillageName = destination.name;
  navigationState.currentRouteId = missionRouteNetwork.startRouteId;
  navigationState.correctRouteId = missionRouteNetwork.startRouteId;
  navigationState.activeJunctionId = "None";
  navigationState.nearestVillagerId = "None";
  navigationState.nearestDirectionVillagerId = "None";
  navigationState.canAsk = false;
  navigationState.canAskDirection = false;
  navigationState.isOnWrongRoute = false;
  navigationState.lastAskedJunctionId = "None";
  navigationState.guidanceDirection = "NONE";
  navigationState.guidanceTimeRemaining = 0;
  navigationState.lastDirectionGiven = "None";
  navigationState.nextJunctionRouteDistance = -1;
  navigationState.currentJunctionIndex = -1;
  navigationState.selectedJunctionId = "None";
  navigationState.branchDirection = "STRAIGHT";
  navigationState.branchJunctionRouteDistance = 0;
  navigationState.physicalRouteDistance = currentRoadSample.routeDistance;
  navigationState.wrongRouteTravelDistance = 0;
  navigationState.lastPhysicalRouteDistance =
    currentRoadSample.routeDistance;
  navigationState.askUiVisible = false;
  navigationState.junctionId = "None";
  navigationState.incomingRouteId = "None";
  navigationState.availableOutgoingRouteIds.length = 0;
  navigationState.correctOutgoingRouteId = "None";
  navigationState.selectedOutgoingRouteId = "None";
  navigationState.candidateRouteId = "None";
  navigationState.branchCommitted = false;
  navigationState.branchSeparationDistance = 0;
  navigationState.distanceFromJunction = Number.POSITIVE_INFINITY;
  navigationState.branchCommitProgress = 0;
  resetBullGuidanceState(
    bullGuidanceState,
    missionRouteNetwork.startRouteId,
    BRANCH_COMMIT_DISTANCE,
  );
  askDirectionButton.classList.add("hidden");
  closeDirectionDialogue();
  roadGameplay.setVillagerGuidance("None", "NONE", false);
}

function rebuildRouteNetwork() {
  missionRouteNetwork.junctionCount = generateRouteNetwork(
    routeState.startRouteDistance,
    routeState.targetRouteDistance,
    state.mission.level,
    state.missionIndex,
    state.mission.destinationVillageName,
    junctionDescriptors,
    missionRouteNetwork,
  );
  classifyJunctions();
  configureJunctionRoads(
    junctionDescriptors,
    missionRouteNetwork.junctionCount,
    state.mission.level,
  );
  resetNavigationState();
  roadGameplay.configureRouteNetwork(
    junctionDescriptors,
    missionRouteNetwork.junctionCount,
    sampleBaseRouteDistance,
    state.mission.level,
  );
}

function initializeMissionRoute() {
  routeState.currentRouteDistance = currentRoadSample.routeDistance;
  routeState.startRouteDistance = currentRoadSample.routeDistance;
  routeState.requiredRouteDistance = state.mission.distance;
  routeState.targetRouteDistance = (
    routeState.startRouteDistance + routeState.requiredRouteDistance
  );
  routeState.travelledRouteDistance = 0;
  routeState.remainingRouteDistance = routeState.requiredRouteDistance;
  routeState.missionProgressRatio = 0;
  routeState.chunkIndex = currentRoadSample.chunkIndex;
  routeState.localDistance = currentRoadSample.localDistance;
  state.progress = 0;
  rebuildRouteNetwork();
  alignMissionSpawn();
  rebuildVillage();
  rebuildMissionRouteMarkers();
  rebuildProceduralHazards();
  rebuildProceduralEvents();
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
  const deliveryDx = nextX - missionMarkerState.destinationWorldPosition.x;
  const deliveryDz = nextZ - missionMarkerState.destinationWorldPosition.z;
  if (
    deliveryDx * deliveryDx + deliveryDz * deliveryDz
    <= DELIVERY_SCENERY_CLEARANCE * DELIVERY_SCENERY_CLEARANCE
  ) {
    return false;
  }
  return obstacles.some((obstacle) => {
    if (
      obstacle.category !== "hazard"
      || obstacle.collidable !== true
      || obstacle.damaging !== true
    ) {
      return false;
    }
    const dx = nextX - obstacle.x;
    const dz = nextZ - obstacle.z;
    return dx * dx + dz * dz < (obstacle.radius + 1.65) ** 2;
  });
}

function updateForwardSafety() {
  const speedRatio = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  const lookAhead = THREE.MathUtils.lerp(
    BLOCKED_LOOKAHEAD_MIN,
    BLOCKED_LOOKAHEAD_MAX,
    speedRatio,
  );
  const reversing = controls.getTargetSpeed() < 0 || state.speed < -0.08;
  const travelHeading = reversing
    ? state.heading + Math.PI
    : state.heading;
  roadGameplay.checkForwardSafety(
    cart.position,
    travelHeading,
    lookAhead,
    forwardSafety,
  );
  checkWaterAhead(cart.position, travelHeading, lookAhead, forwardSafety);
  const forwardX = Math.sin(travelHeading);
  const forwardZ = Math.cos(travelHeading);
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (obstacle.collidable !== true || obstacle.category === "hazard") continue;
    const dx = obstacle.x - cart.position.x;
    const dz = obstacle.z - cart.position.z;
    const forward = dx * forwardX + dz * forwardZ;
    if (forward <= 2 || forward >= lookAhead || forward >= forwardSafety.distance) continue;
    const lateral = dx * Math.cos(travelHeading) - dz * Math.sin(travelHeading);
    if (Math.abs(lateral) > obstacle.radius + 1.65) continue;
    forwardSafety.obstacleAhead = true;
    forwardSafety.blocked = true;
    forwardSafety.smallObstacle = false;
    forwardSafety.side = lateral >= 0 ? 1 : -1;
    forwardSafety.distance = forward;
    forwardSafety.reason = obstacle.category === "constructed"
      ? "BUILDING_OR_WALL"
      : "NON_DRIVABLE_TERRAIN";
  }
  const route = routeSegmentForId(navigationState.currentRouteId);
  const stoppingDistance = Math.max(
    ROUTE_END_STOP_MARGIN,
    lookAhead + state.speed * state.speed / (2 * tuning.braking) + 2,
  );
  if (
    !reversing
    && route
    && navigationState.candidateRouteId === "None"
    && route.endRouteDistance - currentRoadSample.routeDistance <= stoppingDistance
  ) {
    forwardSafety.obstacleAhead = true;
    forwardSafety.blocked = true;
    forwardSafety.smallObstacle = false;
    forwardSafety.distance = Math.max(0, route.endRouteDistance - currentRoadSample.routeDistance);
    forwardSafety.reason = "ROUTE_END";
  }
  const boundaryProbeX = cart.position.x + forwardX * 4;
  const boundaryProbeZ = cart.position.z + forwardZ * 4;
  if (
    Math.abs(boundaryProbeX) >= WORLD_SAFETY_HALF_WIDTH
    || boundaryProbeZ >= 495
    || boundaryProbeZ <= -345
  ) {
    forwardSafety.obstacleAhead = true;
    forwardSafety.blocked = true;
    forwardSafety.smallObstacle = false;
    forwardSafety.distance = 0;
    forwardSafety.reason = "WORLD_BOUNDARY";
  }
  bullGuidanceState.obstacleAhead = forwardSafety.obstacleAhead;
  bullGuidanceState.blockedReason = forwardSafety.blocked
    ? forwardSafety.reason
    : "None";
  bullGuidanceState.blockerDistance = forwardSafety.distance;
  bullGuidanceState.canReverseFromBlocker = !reversing || !forwardSafety.blocked;
  if (forwardSafety.blocked) {
    if (bullGuidanceState.state !== BULL_GUIDANCE_STATES.BLOCKED) {
      window.clearTimeout(checkpointTimer);
      checkpointMessage.textContent = "Bulls are waiting for direction";
      checkpointMessage.classList.remove("hidden");
    }
    setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.BLOCKED);
  } else if (bullGuidanceState.waitingForGuidance) {
    bullGuidanceState.waitingForGuidance = false;
    if (checkpointMessage.textContent === "Bulls are waiting for direction") {
      checkpointMessage.classList.add("hidden");
    }
  } else if (forwardSafety.smallObstacle) {
    setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.AVOIDING_OBSTACLE);
  }
  if (!forwardSafety.obstacleAhead) {
    bullGuidanceState.blockedReason = "None";
    bullGuidanceState.blockerDistance = Number.POSITIVE_INFINITY;
  }
}

function acceptForwardCommand() {
  if (!state.started || state.journeyStatus !== "playing") return;
  updateCurrentRoadSample();
  updateForwardSafety();
  bullGuidanceState.forwardCommandAccepted = !forwardSafety.blocked;
  if (forwardSafety.blocked) return;
  bullGuidanceState.obstacleAhead = false;
  bullGuidanceState.blockedReason = "None";
  bullGuidanceState.blockerDistance = Number.POSITIVE_INFINITY;
  bullGuidanceState.waitingForGuidance = false;
  bullGuidanceState.reverseSteeringAmount = 0;
  if (
    bullGuidanceState.state === BULL_GUIDANCE_STATES.BLOCKED
    || bullGuidanceState.state === BULL_GUIDANCE_STATES.STOPPED
    || bullGuidanceState.state === BULL_GUIDANCE_STATES.TURNING_AROUND
  ) {
    setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.FOLLOW_ROAD);
  }
  if (checkpointMessage.textContent === "Bulls are waiting for direction") {
    checkpointMessage.classList.add("hidden");
  }
}

function showCheckpoint(remaining) {
  window.clearTimeout(checkpointTimer);
  checkpointMessage.textContent =
    `${remaining} m to ${navigationState.destinationVillageName}`;
  checkpointMessage.classList.remove("hidden");
  checkpointTimer = window.setTimeout(() => {
    checkpointMessage.classList.add("hidden");
  }, 2100);
}

function showVillageToast(message) {
  window.clearTimeout(checkpointTimer);
  checkpointMessage.textContent = message;
  checkpointMessage.classList.remove("hidden");
  checkpointTimer = window.setTimeout(() => {
    checkpointMessage.classList.add("hidden");
  }, 2400);
}

function showVillageArrival() {
  window.clearTimeout(villageWelcomeTimer);
  const { record, isNewDiscovery } = discoverVillage(
    villageProgressStore,
    villageDescriptor,
  );
  saveVillageProgress(villageProgressStore);
  villageWelcomeKicker.textContent = isNewDiscovery
    ? "NEW VILLAGE DISCOVERED"
    : "WELCOME TO";
  villageWelcomeName.textContent = villageDescriptor.name;
  villageWelcomeKnown.textContent = `Known for ${villageDescriptor.knownFor}`;
  villageWelcomeReputation.textContent =
    `Reputation ${record.reputation}%`;
  villageWelcome.classList.remove("hidden");
  villageWelcomeTimer = window.setTimeout(() => {
    villageWelcome.classList.add("hidden");
  }, isNewDiscovery ? 4800 : 3800);
}

function renderVillageInformation() {
  const summary = villageProgressSummary(
    villageProgressStore,
    DESTINATION_VILLAGES.length,
  );
  villagesDiscovered.textContent =
    `${summary.discovered} / ${DESTINATION_VILLAGES.length}`;
  villagesDeliveries.textContent = String(summary.deliveriesCompleted);
  villagesBestReward.textContent = `${summary.bestReward} Coins`;
  villagesCompletion.textContent = `${summary.completionPercentage}%`;
  villageInfoList.replaceChildren();
  if (summary.villages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "village-info-empty";
    empty.textContent = "No villages discovered yet.";
    villageInfoList.append(empty);
    return;
  }
  for (const village of summary.villages) {
    const entry = document.createElement("article");
    entry.className = "village-info-entry";
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = village.name;
    const knownFor = document.createElement("small");
    knownFor.textContent =
      `${village.populationSize} • ${village.knownFor} • ${village.landmark}`;
    identity.append(name, knownFor);
    const deliveryStats = document.createElement("span");
    const bestTime = village.bestDeliveryTime === null
      ? "—"
      : formatMissionTime(village.bestDeliveryTime);
    deliveryStats.textContent =
      `${village.deliveriesCompleted} deliveries • Best ${bestTime} • ${village.bestReward} Coins`;
    const reputation = document.createElement("b");
    reputation.textContent = `${village.reputation}%`;
    entry.append(identity, deliveryStats, reputation);
    villageInfoList.append(entry);
  }
}

function openVillageMenu() {
  if (!state.started || state.journeyStatus !== "playing") return;
  state.paused = true;
  controls.resetAll();
  controls.setEnabled(false);
  touchControls.classList.add("hidden");
  renderVillageInformation();
  pauseMenu.classList.remove("is-hidden");
  resumeButton.focus({ preventScroll: true });
}

function closeVillageMenu() {
  if (!state.paused) return;
  state.paused = false;
  pauseMenu.classList.add("is-hidden");
  if (state.journeyStatus === "playing") {
    controls.setEnabled(true);
    touchControls.classList.remove("hidden");
  }
  menuButton.focus({ preventScroll: true });
}

function confirmDelivery() {
  if (
    state.journeyStatus !== "playing"
    || !deliveryState.deliveryInteractionAvailable
    || deliveryState.completed
  ) {
    return;
  }
  if (
    !deliveryState.insideDestinationVillage
    || !deliveryState.withinDeliveryZone
    || !deliveryState.cartStopped
  ) {
    if (!deliveryState.cartStopped) {
      showVillageToast("Stop the cart to deliver");
    }
    return;
  }
  deliveryState.completed = true;
  deliveryState.deliveryInteractionAvailable = false;
  deliveryState.completionEligible = true;
  villageState.reachedShown = true;
  deliveryInteractionButton.classList.add("hidden");
  roadGameplay.setDestinationVisible(false);
  deliveryState.markerVisible = false;
  audioManager.playWorldCue("bell", 0, 0, 0.34);
  showVillageToast("Goods Delivered Successfully");
  beginJourneyFinish();
}

function beginJourneyFinish() {
  if (state.journeyStatus !== "playing") return;
  state.progress = routeState.requiredRouteDistance;
  routeState.remainingRouteDistance = 0;
  routeState.missionProgressRatio = 1;
  deliveryState.completionEligible = true;
  state.journeyStatus = "finishing";
  controls.resetAll();
  controls.setEnabled(false);
  hint.classList.add("hidden");
}

function showMissionResult(eyebrow, title, copy, buttonLabel, details = null) {
  finishEyebrow.textContent = eyebrow;
  finishTitle.textContent = title;
  finishCopy.textContent = copy;
  replayLabel.textContent = buttonLabel;
  finishDetails.classList.toggle("hidden", !details);
  if (details) {
    finishVillage.textContent = details.village;
    finishReward.textContent = details.reward;
    finishTime.textContent = details.time;
    finishCargoCondition.textContent = details.cargoCondition;
    finishReputation.textContent = details.reputation || "—";
  }
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
  deliveryInteractionButton.classList.add("hidden");
  state.nextMissionIndex = (state.missionIndex + 1) % MISSIONS.length;
  const cargoCondition = THREE.MathUtils.clamp(
    cargoPhysics.stability.stability,
    0,
    100,
  );
  const reputationResult = recordVillageDelivery(
    villageProgressStore,
    villageDescriptor,
    {
      success: true,
      elapsed: state.elapsed,
      timeLimit: state.mission.timeLimit,
      cargoCondition,
      reward: state.mission.reward,
    },
  );
  saveVillageProgress(villageProgressStore);
  showMissionResult(
    "Mission complete",
    "Mission Complete",
    `The ${CARGO_TYPES[state.mission.cargoType].label.toLowerCase()} arrived safely in ${navigationState.destinationVillageName}.`,
    "CONTINUE",
    {
      village: navigationState.destinationVillageName,
      reward: `${state.mission.reward} Coins`,
      time: formatMissionTime(state.elapsed),
      cargoCondition: `${Math.round(cargoCondition)}%`,
      reputation:
        `+${reputationResult.gain.total} • ${reputationResult.record.reputation}%`,
    },
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
  deliveryInteractionButton.classList.add("hidden");
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

function junctionForId(junctionId) {
  for (let index = 0; index < missionRouteNetwork.junctionCount; index += 1) {
    if (junctionDescriptors[index].id === junctionId) {
      return junctionDescriptors[index];
    }
  }
  return null;
}

function updateDirectionInteraction(delta) {
  if (navigationState.guidanceTimeRemaining > 0) {
    navigationState.guidanceTimeRemaining = Math.max(
      0,
      navigationState.guidanceTimeRemaining - delta,
    );
    if (navigationState.guidanceTimeRemaining === 0) {
      navigationState.guidanceDirection = "NONE";
      roadGameplay.setVillagerGuidance("None", "NONE", false);
    }
  }
  if (navigationState.dialogueActive) {
    navigationState.dialogueTimeRemaining = Math.max(
      0,
      navigationState.dialogueTimeRemaining - delta,
    );
    if (navigationState.dialogueTimeRemaining === 0) {
      closeDirectionDialogue();
    }
  }

  let nearestVillagerId = "None";
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (
    let index = 0;
    index < roadGameplay.directionVillagers.length;
    index += 1
  ) {
    const villager = roadGameplay.directionVillagers[index];
    if (
      !villager.active
      || villager.junctionId !== navigationState.activeJunctionId
      || (
        navigationState.isOnWrongRoute
          ? (
            !villager.isWrongRouteHelper
            || villager.routeId !== navigationState.currentRouteId
          )
          : villager.isWrongRouteHelper
      )
    ) {
      continue;
    }
    const dx = villager.x - cart.position.x;
    const dz = villager.z - cart.position.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestVillagerId = villager.id;
    }
  }

  navigationState.nearestVillagerId = nearestVillagerId;
  navigationState.nearestDirectionVillagerId = nearestVillagerId;
  navigationState.canAsk = (
    state.journeyStatus === "playing"
    && nearestDistanceSquared <= DIRECTION_ASK_RANGE * DIRECTION_ASK_RANGE
    && !navigationState.dialogueActive
  );
  navigationState.canAskDirection = navigationState.canAsk;
  if (navigationState.askUiVisible !== navigationState.canAsk) {
    navigationState.askUiVisible = navigationState.canAsk;
    askDirectionButton.classList.toggle(
      "hidden",
      !navigationState.canAsk,
    );
  }
}

function directionLabel(direction) {
  if (direction === "LEFT") return "LEFT";
  if (direction === "RIGHT") return "RIGHT";
  return "STRAIGHT";
}

function askVillagerForDirection() {
  if (!navigationState.canAsk) return;
  const junction = junctionForId(navigationState.activeJunctionId);
  if (!junction) return;
  const direction = junction.correctDirection;
  const isWrongRoute = navigationState.isOnWrongRoute;
  const villageName = navigationState.destinationVillageName;

  driverDirectionDialogue.dialogueId =
    `driver_ask_${state.mission.destinationVillageId}`;
  driverDirectionDialogue.text =
    `Ram Ram sa... ${villageName} ka rasta kidhar hai?`;
  driverDirectionDialogue.audioKey =
    `driver_ask_${state.mission.destinationVillageId}`;
  driverDirectionDialogue.destinationVillageName = villageName;
  driverDirectionDialogue.direction = direction;
  driverDirectionDialogue.isWrongRoute = isWrongRoute;

  villagerDirectionDialogue.dialogueId = isWrongRoute
    ? `villager_wrong_return_${direction.toLowerCase()}`
    : `villager_${direction.toLowerCase()}`;
  villagerDirectionDialogue.audioKey =
    villagerDirectionDialogue.dialogueId;
  villagerDirectionDialogue.destinationVillageName = villageName;
  villagerDirectionDialogue.direction = direction;
  villagerDirectionDialogue.isWrongRoute = isWrongRoute;
  if (isWrongRoute) {
    const returnDirection = direction === "LEFT"
      ? "baaye mudna"
      : direction === "RIGHT" ? "daaye mudna" : "seedha jaana";
    villagerDirectionDialogue.text =
      `Bhai, ye ${villageName} ka rasta nahi hai. Wapas chaurahe tak jao, phir ${returnDirection}.`;
  } else if (direction === "LEFT") {
    villagerDirectionDialogue.text =
      "Is chaurahe se baaye mud jao.";
  } else if (direction === "RIGHT") {
    villagerDirectionDialogue.text =
      "Is chaurahe se daaye mud jao.";
  } else {
    villagerDirectionDialogue.text = "Seedha jao.";
  }

  directionDriverLine.textContent = driverDirectionDialogue.text;
  directionVillagerLine.textContent = villagerDirectionDialogue.text;
  directionGuidance.textContent = isWrongRoute
    ? `RETURN · THEN ${directionLabel(direction)}`
    : directionLabel(direction);
  directionDialogueElement.classList.remove("hidden");
  askDirectionButton.classList.add("hidden");
  navigationState.askUiVisible = false;
  navigationState.canAsk = false;
  navigationState.canAskDirection = false;
  navigationState.dialogueActive = true;
  navigationState.dialogueTimeRemaining = DIRECTION_DIALOGUE_DURATION;
  navigationState.lastAskedJunctionId = junction.id;
  navigationState.guidanceDirection = direction;
  navigationState.guidanceTimeRemaining = DIRECTION_GUIDANCE_DURATION;
  navigationState.lastDirectionGiven = isWrongRoute
    ? `RETURN_${direction}`
    : direction;
  roadGameplay.setVillagerGuidance(
    navigationState.nearestVillagerId,
    direction,
    true,
  );
}

function updateJourneyProgress() {
  if (state.journeyStatus !== "playing") return;
  const physicalRouteDistance = currentRoadSample.routeDistance;
  if (navigationState.isOnWrongRoute) {
    navigationState.wrongRouteTravelDistance += Math.abs(
      physicalRouteDistance - navigationState.lastPhysicalRouteDistance,
    );
  } else {
    routeState.currentRouteDistance = physicalRouteDistance;
  }
  navigationState.lastPhysicalRouteDistance = physicalRouteDistance;
  routeState.travelledRouteDistance = Math.max(
    0,
    routeState.currentRouteDistance - routeState.startRouteDistance,
  );
  routeState.remainingRouteDistance = Math.max(
    0,
    routeState.targetRouteDistance - routeState.currentRouteDistance,
  );
  routeState.missionProgressRatio = THREE.MathUtils.clamp(
    routeState.travelledRouteDistance / routeState.requiredRouteDistance,
    0,
    1,
  );
  routeState.chunkIndex = currentRoadSample.chunkIndex;
  routeState.localDistance = currentRoadSample.localDistance;
  villageState.distanceToVillage = Math.max(
    0,
    villageDescriptor.entrance.routeDistance - routeState.currentRouteDistance,
  );
  if (
    !villageState.enteringShown
    && !navigationState.isOnWrongRoute
    && routeState.currentRouteDistance >= villageDescriptor.entrance.routeDistance
  ) {
    villageState.enteringShown = true;
    showVillageArrival();
  }
  updateHazardState();
  updateEventState();
  state.progress = Math.min(
    routeState.travelledRouteDistance,
    routeState.requiredRouteDistance,
  );
  for (let index = 0; index < CHECKPOINTS.length; index += 1) {
    const checkpoint = CHECKPOINTS[index];
    const checkpointRouteDistance = (
      routeState.targetRouteDistance - checkpoint
    );
    if (
      routeState.currentRouteDistance >= checkpointRouteDistance
      && !navigationState.isOnWrongRoute
      && !state.passedCheckpoints.has(checkpoint)
    ) {
      state.passedCheckpoints.add(checkpoint);
      checkpointMarkerStates[index].triggered = true;
      roadGameplay.setCheckpointTriggered(index, true);
      showCheckpoint(checkpoint);
    }
  }
  updateNextCheckpointRouteDistance();
  const routeDistanceFromDestination = Math.abs(
    deliveryState.deliveryRouteDistance - routeState.currentRouteDistance,
  );
  const destinationDeltaX = (
    cart.position.x - missionMarkerState.destinationWorldPosition.x
  );
  const destinationDeltaZ = (
    cart.position.z - missionMarkerState.destinationWorldPosition.z
  );
  const destinationLateralDistance = Math.abs(
    destinationDeltaX * missionMarkerState.destinationNormalX
    + destinationDeltaZ * missionMarkerState.destinationNormalZ
  );
  const deliveryLateralTolerance = Math.max(
    DESTINATION_LATERAL_TOLERANCE_MIN,
    currentRoadSample.width * 0.42,
  );
  deliveryState.destinationRouteId = missionRouteNetwork.destinationRouteId;
  deliveryState.currentRouteId = navigationState.currentRouteId;
  deliveryState.routeDistanceDifference = routeDistanceFromDestination;
  deliveryState.lateralDistance = destinationLateralDistance;
  deliveryState.withinDeliveryZone = (
    routeDistanceFromDestination <= DESTINATION_ROUTE_TOLERANCE
    && destinationLateralDistance <= deliveryLateralTolerance
  );
  deliveryState.insideDestinationVillage = (
    !navigationState.isOnWrongRoute
    && deliveryState.currentRouteId === deliveryState.destinationRouteId
    && navigationState.destinationVillageId
      === state.mission.destinationVillageId
    && routeState.currentRouteDistance
      >= villageDescriptor.entrance.routeDistance
    && routeState.currentRouteDistance
      <= villageDescriptor.routeDistance + 24
  );
  deliveryState.cartStopped = Math.abs(state.speed) <= DELIVERY_STOP_SPEED;
  deliveryState.markerVisible = (
    deliveryState.insideDestinationVillage && !deliveryState.completed
  );
  roadGameplay.setDestinationVisible(deliveryState.markerVisible);
  const deliveryRouteEligible = (
    deliveryState.insideDestinationVillage
    && deliveryState.withinDeliveryZone
  );
  deliveryState.deliveryInteractionAvailable = (
    deliveryRouteEligible && !deliveryState.completed
  );
  deliveryInteractionButton.classList.toggle(
    "hidden",
    !deliveryState.deliveryInteractionAvailable,
  );
  deliveryState.completionEligible = (
    deliveryRouteEligible && deliveryState.completed
  );
}

function updateMovement(delta) {
  const steerInput =
    (controls.state.left ? 1 : 0)
    - (controls.state.right ? 1 : 0);
  bullGuidanceState.playerSteeringInput = steerInput;
  if (steerInput !== 0 && steerInput !== state.previousSteerInput) {
    clearPlayerGuidance(bullGuidanceState);
    bullGuidanceState.playerGuidanceDirection = steerInput > 0
      ? DRIVER_DIRECTIONS.LEFT
      : DRIVER_DIRECTIONS.RIGHT;
    bullGuidanceState.playerGuidanceRemainingTime = PLAYER_GUIDANCE_DURATION;
    bullGuidanceState.playerGuidanceActive = true;
    bullGuidanceState.lastDriverDirection = bullGuidanceState.playerGuidanceDirection;
    bullGuidanceState.driverDirection = bullGuidanceState.playerGuidanceDirection;
    bullGuidanceState.driverInputAge = 0;
  }
  state.previousSteerInput = steerInput;
  bullGuidanceState.latchedSteeringInput = bullGuidanceState.playerGuidanceActive
    ? bullGuidanceState.playerGuidanceDirection === DRIVER_DIRECTIONS.LEFT ? 1 : -1
    : 0;
  updateCurrentRoadSample();
  updateStableRoadHeading(delta);
  if (bullGuidanceState.playerGuidanceActive) {
    bullGuidanceState.playerGuidanceRemainingTime = Math.max(
      0,
      bullGuidanceState.playerGuidanceRemainingTime - delta,
    );
    bullGuidanceState.driverInputAge += delta;
    if (
      bullGuidanceState.playerGuidanceTargetRouteId === "None"
      && navigationState.candidateRouteId !== "None"
    ) {
      bullGuidanceState.playerGuidanceTargetRouteId = navigationState.candidateRouteId;
    }
    if (bullGuidanceState.playerGuidanceRemainingTime === 0) {
      clearPlayerGuidance(bullGuidanceState);
      bullGuidanceState.latchedSteeringInput = 0;
    }
  }
  const guidanceTarget = bullGuidanceState.playerGuidanceActive
    ? bullGuidanceState.playerGuidanceDirection === DRIVER_DIRECTIONS.LEFT ? 1 : -1
    : 0;
  bullGuidanceState.guidanceAmount = damp(
    bullGuidanceState.guidanceAmount,
    guidanceTarget,
    guidanceTarget === 0 ? 2.8 : 2.4,
    delta,
  );
  const activeRoute = routeSegmentForId(navigationState.currentRouteId);
  const turnaroundStart = activeRoute && !activeRoute.isCorrect
    ? activeRoute.endRouteDistance - activeRoute.turnaroundLength
    : Number.POSITIVE_INFINITY;
  bullGuidanceState.insideTurnaroundArea = Boolean(
    activeRoute
    && !activeRoute.isCorrect
    && currentRoadSample.routeDistance >= turnaroundStart
    && currentRoadSample.routeDistance <= activeRoute.endRouteDistance,
  );
  bullGuidanceState.turnaroundAreaId = bullGuidanceState.insideTurnaroundArea
    ? activeRoute.turnaroundAreaId
    : "None";
  bullGuidanceState.turnaroundProgress = bullGuidanceState.insideTurnaroundArea
    ? THREE.MathUtils.clamp(
      (currentRoadSample.routeDistance - turnaroundStart)
        / activeRoute.turnaroundLength,
      0,
      1,
    )
    : 0;
  updateForwardSafety();
  let targetSpeed = state.journeyStatus === "playing"
    ? controls.getTargetSpeed() * surfaceState.speedMultiplier
    : 0;
  if (
    navigationState.candidateRouteId !== "None"
    && !navigationState.branchCommitted
    && targetSpeed > JUNCTION_SAFE_SPEED
  ) {
    targetSpeed = JUNCTION_SAFE_SPEED;
  }
  if (forwardSafety.blocked && targetSpeed !== 0) targetSpeed = 0;
  bullGuidanceState.currentTargetSpeed = targetSpeed;
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
  bullGuidanceState.actualSpeed = state.speed;
  const speedRatio = Math.min(Math.abs(state.speed) / tuning.maxForward, 1);
  const maximumTurnRate = THREE.MathUtils.lerp(
    tuning.steeringRateLowSpeed,
    tuning.steeringRateHighSpeed,
    speedRatio,
  );
  const reverseTurning = controls.reverseActive && steerInput !== 0;
  if (reverseTurning) {
    setBullGuidanceState(bullGuidanceState, BULL_GUIDANCE_STATES.TURNING_AROUND);
  }
  const forwardRoadHeading = state.stableRoadHeading;
  const reverseRoadHeading = Math.atan2(
    Math.sin(state.stableRoadHeading + Math.PI),
    Math.cos(state.stableRoadHeading + Math.PI),
  );
  let targetRoadHeading = Math.abs(wrappedAngleDelta(state.heading, forwardRoadHeading))
    <= Math.abs(wrappedAngleDelta(state.heading, reverseRoadHeading))
    ? forwardRoadHeading
    : reverseRoadHeading;
  const roadHalfWidth = Math.max(0.5, currentRoadSample.width * 0.5);
  const safeRoadHalfWidth = Math.max(
    0.15,
    roadHalfWidth - VEHICLE_HALF_WIDTH - ROAD_FOOTPRINT_SAFETY_MARGIN,
  );
  bullGuidanceState.safeRoadHalfWidth = safeRoadHalfWidth;
  bullGuidanceState.vehicleHalfWidth = VEHICLE_HALF_WIDTH;
  const absoluteLateral = Math.abs(state.lateralOffset);
  const safeZoneLimit = safeRoadHalfWidth * ROAD_SAFE_ZONE_RATIO;
  const outsideRoad = absoluteLateral > safeRoadHalfWidth;
  const edgeRoad = !outsideRoad && absoluteLateral > safeZoneLimit;
  bullGuidanceState.roadZone = outsideRoad ? "OUTSIDE" : edgeRoad ? "EDGE" : "SAFE";
  const containmentProgress = edgeRoad
    ? smoothstep01(
      (absoluteLateral - safeZoneLimit)
        / Math.max(0.1, safeRoadHalfWidth - safeZoneLimit),
    )
    : outsideRoad ? 1 : 0;
  const outsideProgress = outsideRoad
    ? smoothstep01(
      (absoluteLateral - safeRoadHalfWidth) / Math.max(0.5, safeRoadHalfWidth),
    )
    : 0;
  const containmentForce = -Math.sign(state.lateralOffset)
    * (outsideRoad ? 0.72 + outsideProgress * 0.28 : containmentProgress * 0.42);
  bullGuidanceState.roadContainmentForce = containmentForce;
  state.lateralRecenteringForce = containmentForce;
  const speedSteeringFactor = THREE.MathUtils.lerp(1, 0.48, speedRatio);
  let driverHeadingOffset = bullGuidanceState.guidanceAmount
    * 0.28
    * speedSteeringFactor;
  if (
    navigationState.candidateRouteId !== "None"
    && !navigationState.branchCommitted
    && navigationState.distanceFromJunction >= -ROUTE_CHOICE_DISTANCE
  ) {
    const candidateRoute = routeSegmentForId(navigationState.candidateRouteId);
    if (candidateRoute?.direction === DRIVER_DIRECTIONS.LEFT) {
      driverHeadingOffset += THREE.MathUtils.clamp(
        THREE.MathUtils.degToRad(Math.abs(candidateRoute.branchAngleDegrees)) * 0.4,
        0.18,
        0.28,
      );
    } else if (candidateRoute?.direction === DRIVER_DIRECTIONS.RIGHT) {
      driverHeadingOffset -= THREE.MathUtils.clamp(
        THREE.MathUtils.degToRad(Math.abs(candidateRoute.branchAngleDegrees)) * 0.4,
        0.18,
        0.28,
      );
    }
  }
  if (forwardSafety.smallObstacle) {
    driverHeadingOffset += -forwardSafety.side * 0.12;
  }
  const junctionDecisionActive = navigationState.candidateRouteId !== "None"
    && !navigationState.branchCommitted
    && navigationState.distanceFromJunction >= -ROUTE_CHOICE_DISTANCE;
  const playerGuidanceActive = Math.abs(bullGuidanceState.guidanceAmount) > 0.015;
  const routeCorrectionActive = edgeRoad || outsideRoad;
  const inwardAngle = routeCorrectionActive
    ? -Math.sign(state.lateralOffset) * (outsideRoad
      ? ROAD_OUTSIDE_CORRECTION_ANGLE
      : ROAD_EDGE_CORRECTION_ANGLE * containmentProgress)
    : 0;
  const desiredRoadHeading = targetRoadHeading + inwardAngle;
  const roadHeadingError = wrappedAngleDelta(state.heading, targetRoadHeading);
  bullGuidanceState.roadHeadingError = roadHeadingError;
  bullGuidanceState.headingDeadZone = ROAD_HEADING_DEAD_ZONE;
  let curveCorrectionTarget = 0;
  if (Math.abs(roadHeadingError) > ROAD_HEADING_DEAD_ZONE) {
    curveCorrectionTarget = THREE.MathUtils.clamp(
      roadHeadingError,
      -ROAD_CURVE_MAX_CORRECTION_ANGLE,
      ROAD_CURVE_MAX_CORRECTION_ANGLE,
    );
  }
  let roadCorrectionTarget = 0;
  const desiredRoadError = wrappedAngleDelta(state.heading, desiredRoadHeading);
  if (
    routeCorrectionActive
    && (outsideRoad || Math.abs(desiredRoadError) > ROAD_HEADING_DEAD_ZONE)
  ) {
    roadCorrectionTarget = THREE.MathUtils.clamp(
      desiredRoadError,
      outsideRoad ? -ROAD_OUTSIDE_CORRECTION_ANGLE : -ROAD_EDGE_CORRECTION_ANGLE,
      outsideRoad ? ROAD_OUTSIDE_CORRECTION_ANGLE : ROAD_EDGE_CORRECTION_ANGLE,
    );
  }
  bullGuidanceState.roadCorrectionTarget = roadCorrectionTarget;
  bullGuidanceState.roadFollowStrength = routeCorrectionActive
    ? outsideRoad ? 1 : 0.55
    : curveCorrectionTarget !== 0 ? 0.25 : 0;
  // Curve following and containment are deliberately independent. As edge
  // authority rises, curve authority is reduced so both cannot peak together.
  const curveSteeringVelocity = THREE.MathUtils.clamp(
    curveCorrectionTarget * 0.65,
    -ROAD_AUTO_CORRECTION_RATE,
    ROAD_AUTO_CORRECTION_RATE,
  );
  const containmentRate = outsideRoad
    ? ROAD_OUTSIDE_CORRECTION_RATE
    : ROAD_EDGE_CORRECTION_RATE;
  const containmentSteeringVelocity = routeCorrectionActive
    ? THREE.MathUtils.clamp(
      roadCorrectionTarget * 0.8,
      -containmentRate,
      containmentRate,
    )
    : 0;
  const containmentBlend = Math.max(containmentProgress, outsideProgress);
  let automaticSteeringVelocity = (
    curveSteeringVelocity * (1 - containmentBlend * 0.75)
    + containmentSteeringVelocity
  );
  const automaticRateLimit = outsideRoad
    ? ROAD_OUTSIDE_CORRECTION_RATE
    : edgeRoad ? ROAD_EDGE_CORRECTION_RATE : ROAD_AUTO_CORRECTION_RATE;
  automaticSteeringVelocity = THREE.MathUtils.clamp(
    automaticSteeringVelocity,
    -automaticRateLimit,
    automaticRateLimit,
  );
  state.correctionDirectionAge += delta;
  const requestedAutomaticDirection = Math.sign(automaticSteeringVelocity);
  if (
    requestedAutomaticDirection !== 0
    && state.correctionDirection !== 0
    && requestedAutomaticDirection !== state.correctionDirection
  ) {
    if (
      state.correctionDirectionAge < ROAD_CORRECTION_REVERSE_DELAY
      || Math.abs(state.steeringVelocity) > THREE.MathUtils.degToRad(0.5)
    ) {
      automaticSteeringVelocity = 0;
    } else {
      state.correctionDirection = requestedAutomaticDirection;
      state.correctionDirectionAge = 0;
    }
  } else if (requestedAutomaticDirection !== 0 && state.correctionDirection === 0) {
    state.correctionDirection = requestedAutomaticDirection;
    state.correctionDirectionAge = 0;
  }
  const driverSteeringVelocity = THREE.MathUtils.clamp(
    driverHeadingOffset * 1.25,
    -maximumTurnRate,
    maximumTurnRate,
  );
  let targetSteeringVelocity = (
    automaticSteeringVelocity + driverSteeringVelocity
  ) * surfaceState.steeringFactor;
  if (reverseTurning) {
    targetSteeringVelocity += steerInput * maximumTurnRate * 0.82;
  }
  bullGuidanceState.reverseSteeringAmount = reverseTurning
    ? steerInput * 0.82
    : 0;
  if (Math.abs(state.speed) <= 0.04 && !reverseTurning) targetSteeringVelocity = 0;
  if (
    targetSteeringVelocity * state.steeringVelocity < 0
    && Math.abs(state.steeringVelocity) > 0.01
  ) targetSteeringVelocity = 0;
  const correctionBefore = state.steeringVelocity;
  const correctionDamped = damp(
    correctionBefore,
    targetSteeringVelocity,
    playerGuidanceActive || junctionDecisionActive
      ? tuning.steeringResponse
      : ROAD_CORRECTION_RESPONSE,
    delta,
  );
  const maximumCorrectionStep = maximumTurnRate * delta;
  state.steeringVelocity = correctionBefore + THREE.MathUtils.clamp(
    correctionDamped - correctionBefore,
    -maximumCorrectionStep,
    maximumCorrectionStep,
  );
  const previousCorrectionSign = Math.sign(bullGuidanceState.roadCorrectionApplied);
  const nextCorrectionSign = Math.sign(state.steeringVelocity);
  if (
    previousCorrectionSign !== 0
    && nextCorrectionSign !== 0
    && previousCorrectionSign !== nextCorrectionSign
  ) bullGuidanceState.correctionDirectionChangeCount += 1;
  bullGuidanceState.correctionDirectionWindowTime += delta;
  if (bullGuidanceState.correctionDirectionWindowTime >= 1) {
    bullGuidanceState.correctionDirectionChangesPerSecond =
      bullGuidanceState.correctionDirectionChangeCount
      / bullGuidanceState.correctionDirectionWindowTime;
    bullGuidanceState.correctionDirectionChangeCount = 0;
    bullGuidanceState.correctionDirectionWindowTime = 0;
  }
  bullGuidanceState.roadCorrectionApplied = automaticSteeringVelocity;
  state.steeringOffset = state.steeringVelocity;
  const rotationMovementFactor = smoothstep01(Math.abs(state.speed) / 0.45);
  state.heading += state.steeringVelocity * delta * rotationMovementFactor;
  state.heading = Math.atan2(Math.sin(state.heading), Math.cos(state.heading));
  state.headingAssistAmount = curveCorrectionTarget + roadCorrectionTarget;
  state.autoSteerAmount = automaticSteeringVelocity;
  bullGuidanceState.autoSteerAmount = state.autoSteerAmount;
  headingVector.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  const moveDistance = state.speed * delta;
  const unconstrainedX = cart.position.x + headingVector.x * moveDistance;
  const nextZ = THREE.MathUtils.clamp(
    cart.position.z + headingVector.z * moveDistance,
    -345,
    495,
  );
  const absoluteWorldX = Math.abs(unconstrainedX);
  const safetyProgress = smoothstep01(
    (absoluteWorldX - (WORLD_SAFETY_HALF_WIDTH - WORLD_SAFETY_SOFT_ZONE))
    / WORLD_SAFETY_SOFT_ZONE,
  );
  const nextX = THREE.MathUtils.clamp(
    cart.position.x + (unconstrainedX - cart.position.x) * (1 - safetyProgress * 0.9),
    -WORLD_SAFETY_HALF_WIDTH,
    WORLD_SAFETY_HALF_WIDTH,
  );
  roadState.boundaryResistance = safetyProgress * 0.9;

  if (sceneryObstacleHit(nextX, nextZ)) {
    state.speed *= -0.12;
    state.collisionPulse = 0.16;
    state.collisionStrength = 0.65;
    state.cargoImpact = Math.max(state.cargoImpact, 0.65);
  } else {
    cart.position.x = nextX;
    cart.position.z = nextZ;
  }

  cart.rotation.y = state.heading;
  cart.rotation.z = damp(
    cart.rotation.z,
    -bullGuidanceState.guidanceAmount * speedRatio * 0.022,
    3.2,
    delta,
  );
  updateRoadSamples();
  state.lateralOffset = (
    (cart.position.x - currentRoadSample.centerX) * currentRoadSample.normalX
    + (cart.position.z - currentRoadSample.centerZ) * currentRoadSample.normalZ
  );
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
  setCartGuidanceFeedback(
    animationParts,
    bullGuidanceState.guidanceAmount,
    bullGuidanceState.waitingForGuidance,
  );
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
  lookTarget.copy(cart.position).addScaledVector(headingVector, 4.2 + movement * 0.65);
  lookTarget.y += 1.12 + animationParts.suspensionY * 0.18;
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
  movementDebug.activeVillageName.textContent =
    villageState.activeVillageName;
  movementDebug.activeVillageVillagers.textContent =
    String(villageState.activeVillagerCount);
  movementDebug.activeVillageAnimals.textContent =
    String(villageState.activeAnimalCount);
  movementDebug.deliveryAvailable.textContent =
    deliveryState.deliveryInteractionAvailable ? "YES" : "NO";
  movementDebug.deliveryCompleted.textContent =
    deliveryState.completed ? "YES" : "NO";
}

function updateHud() {
  const remaining = routeState.remainingRouteDistance;
  const travelled = routeState.travelledRouteDistance;
  const localDeliveryDistance = Math.hypot(
    cart.position.x - missionMarkerState.destinationWorldPosition.x,
    cart.position.z - missionMarkerState.destinationWorldPosition.z,
  );
  const showLocalGuidance = (
    deliveryState.insideDestinationVillage
    && state.journeyStatus === "playing"
  );
  distanceLabel.textContent = travelled < 1000
    ? `${Math.floor(travelled)} m`
    : `${(travelled / 1000).toFixed(2)} km`;
  destinationGuidanceLabel.textContent = showLocalGuidance
    ? "DELIVERY POINT"
    : navigationState.destinationVillageName.toUpperCase();
  remainingDistanceLabel.textContent = showLocalGuidance
    ? `${Math.ceil(localDeliveryDistance)} m`
    : `${Math.ceil(remaining)} m`;
  objectiveLabel.textContent = state.journeyStatus === "reached"
    ? `${navigationState.destinationVillageName} reached`
    : showLocalGuidance
      ? `Delivery Point: ${Math.ceil(localDeliveryDistance)} m`
      : `${navigationState.destinationVillageName}: ${Math.ceil(remaining)} m remaining`;
  const progressBucket = Math.floor(state.progress * 2);
  if (progressBucket !== state.hudProgressBucket) {
    state.hudProgressBucket = progressBucket;
    journeyProgressFill.style.transform =
      `scaleX(${routeState.missionProgressRatio})`;
  }
  if (state.missionHudIndex !== state.missionIndex) {
    state.missionHudIndex = state.missionIndex;
    missionNameLabel.textContent =
      `Deliver ${CARGO_TYPES[state.mission.cargoType].label} to ${navigationState.destinationVillageName}`;
  }
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
        playerHeading: Number(state.heading.toFixed(3)),
        roadTangentHeading: Number(state.roadHeading.toFixed(3)),
        headingAssistAmount: state.headingAssistAmount,
        autoSteerAmount: state.autoSteerAmount,
        lateralRecenteringForce: state.lateralRecenteringForce,
        steeringAssist: "BULL_ROAD_FOLLOWING_NORMAL",
        cameraFar: camera.far,
        fogNear: scene.fog?.near ?? 0,
        fogFar: scene.fog?.far ?? 0,
        visibleChunkCount: worldGenerator.debug.loadedChunks,
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
      routeMission: {
        currentRouteDistance: Number(
          routeState.currentRouteDistance.toFixed(3),
        ),
        startRouteDistance: Number(routeState.startRouteDistance.toFixed(3)),
        targetRouteDistance: Number(routeState.targetRouteDistance.toFixed(3)),
        travelledRouteDistance: Number(
          routeState.travelledRouteDistance.toFixed(3),
        ),
        remainingRouteDistance: Number(
          routeState.remainingRouteDistance.toFixed(3),
        ),
        missionProgressRatio: Number(
          routeState.missionProgressRatio.toFixed(5),
        ),
        nextCheckpointRouteDistance: Number(
          routeState.nextCheckpointRouteDistance.toFixed(3),
        ),
        completionEligible: deliveryState.completionEligible,
        chunkIndex: routeState.chunkIndex,
        localDistance: Number(routeState.localDistance.toFixed(3)),
      },
      missionMarkers: missionMarkerState,
      delivery: deliveryState,
      proceduralHazards: hazardState,
      proceduralEvents: eventState,
      bullGuidanceState,
      navigation: navigationState,
      routeNetwork: missionRouteNetwork,
      junctionGeometry: roadGameplay.junctionDebug,
      proceduralVillage: {
        ...villageState,
        descriptor: villageDescriptor,
        visual: roadGameplay.villageDebug,
      },
      directionDialogue: directionDialogueState,
    });
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!state.paused) state.elapsed += delta;
  if (state.started && !state.paused) updateMovement(delta);
  worldGenerator.update(
    cart.position,
    state.mission.level,
    state.paused ? 0 : delta,
    renderer.info.render.calls,
  );
  if (!state.paused) updateDirectionInteraction(delta);
  if (import.meta.env.DEV && !state.started) updateRoadSamples();
  if (import.meta.env.DEV && !state.started) updateRoadState(0, true);
  if (import.meta.env.DEV && !state.started) updateSurfaceState(0, true);
  villageLife.update({
    cartPosition: cart.position,
    cartSpeed: state.speed,
    elapsed: state.elapsed,
    delta,
  });
  roadGameplay.updateVillage(cart.position, state.elapsed, delta);
  villageState.activeVillageName =
    roadGameplay.villageDebug.activeVillageName;
  villageState.activeVillagerCount =
    roadGameplay.villageDebug.activeVillagerCount;
  villageState.activeAnimalCount =
    roadGameplay.villageDebug.activeAnimalCount;
  updateCamera(delta);
  updateMovementDebug(delta);
  updateHud();
  renderer.render(scene, camera);
  previousPosition.copy(cart.position);
  requestAnimationFrame(animate);
}

function startGame() {
  initializeRoadPose();
  initializeMissionRoute();
  state.started = true;
  state.paused = false;
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
  window.clearTimeout(villageWelcomeTimer);
  state.paused = false;
  pauseMenu.classList.add("is-hidden");
  villageWelcome.classList.add("hidden");
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
  state.missionHudIndex = -1;
  state.stabilityHudBucket = -1;
  state.cargoImpact = 0;
  state.cargoCameraFeedback = 0;
  state.lateralOffset = 0;
  state.steeringOffset = 0;
  state.steeringVelocity = 0;
  state.roadHeading = 0;
  state.headingAssistAmount = 0;
  state.autoSteerAmount = 0;
  state.lateralRecenteringForce = 0;
  state.stableRoadHeading = 0;
  state.stableRoadHeadingReady = false;
  state.rawRoadHeading = 0;
  state.correctionDirection = 0;
  state.correctionDirectionAge = 0;
  state.previousSteerInput = 0;
  state.terrainPitch = 0;
  state.journeyStatus = "playing";
  state.passedCheckpoints.clear();
  routeState.currentRouteDistance = 0;
  routeState.startRouteDistance = 0;
  routeState.targetRouteDistance = 0;
  routeState.requiredRouteDistance = state.mission.distance;
  routeState.travelledRouteDistance = 0;
  routeState.remainingRouteDistance = state.mission.distance;
  routeState.missionProgressRatio = 0;
  routeState.nextCheckpointRouteDistance = 0;
  routeState.chunkIndex = 0;
  routeState.localDistance = 0;
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
  initializeMissionRoute();
  previousPosition.copy(cart.position);
  camera.position.set(0, tuning.cameraHeight + 0.8, missionStartZ() - tuning.cameraDistance);
  camera.lookAt(0, 1.4, missionStartZ() + 4.4);
  roadSurface.roughness = 0;
  roadSurface.roll = 0;
  cargoPhysics.reset(state.mission.cargoType, state.mission.level);
  finishScreen.classList.add("is-hidden");
  finishDetails.classList.add("hidden");
  checkpointMessage.classList.add("hidden");
  deliveryInteractionButton.classList.add("hidden");
  touchControls.classList.remove("hidden");
  replayButton.blur();
}

playButton.addEventListener("click", startGame);
replayButton.addEventListener("click", replayGame);
menuButton.addEventListener("click", openVillageMenu);
resumeButton.addEventListener("click", closeVillageMenu);
askDirectionButton.addEventListener("click", askVillagerForDirection);
deliveryInteractionButton.addEventListener("click", confirmDelivery);
window.addEventListener("keydown", (event) => {
  if (state.paused) return;
  if (event.code !== "KeyE" || event.repeat) return;
  if (deliveryState.deliveryInteractionAvailable) {
    event.preventDefault();
    confirmDelivery();
    return;
  }
  if (!navigationState.canAsk) return;
  event.preventDefault();
  askVillagerForDirection();
});
window.addEventListener("keydown", (event) => {
  if (event.code !== "Escape" || event.repeat || !state.started) return;
  event.preventDefault();
  if (state.paused) closeVillageMenu();
  else openVillageMenu();
});
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
    remaining: routeState.remainingRouteDistance,
    journeyStatus: state.journeyStatus,
    mission: state.mission.name,
    cargoType: state.mission.cargoType,
    cargoStability: cargoPhysics.stability.stability,
    cartPosition: cart.position.toArray(),
    cartHeading: state.heading,
    playerSteeringInput: bullGuidanceState.playerSteeringInput,
    latchedSteeringInput: bullGuidanceState.latchedSteeringInput,
    rawRoadHeading: bullGuidanceState.rawRoadHeading,
    smoothedRoadHeading: bullGuidanceState.smoothedRoadHeading,
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
        playerHeading: state.heading,
        roadTangentHeading: state.roadHeading,
        headingAssistAmount: state.headingAssistAmount,
        autoSteerAmount: state.autoSteerAmount,
        lateralRecenteringForce: state.lateralRecenteringForce,
        steeringAssist: "BULL_ROAD_FOLLOWING_NORMAL",
        cameraFar: camera.far,
        fogNear: scene.fog?.near ?? 0,
        fogFar: scene.fog?.far ?? 0,
        visibleChunkCount: worldGenerator.debug.loadedChunks,
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
    routeMission: import.meta.env.DEV
      ? {
        currentRouteDistance: routeState.currentRouteDistance,
        startRouteDistance: routeState.startRouteDistance,
        targetRouteDistance: routeState.targetRouteDistance,
        requiredRouteDistance: routeState.requiredRouteDistance,
        travelledRouteDistance: routeState.travelledRouteDistance,
        remainingRouteDistance: routeState.remainingRouteDistance,
        missionProgressRatio: routeState.missionProgressRatio,
        nextCheckpointRouteDistance: routeState.nextCheckpointRouteDistance,
        completionEligible: deliveryState.completionEligible,
        chunkIndex: routeState.chunkIndex,
        localDistance: routeState.localDistance,
      }
      : undefined,
    missionMarkers: import.meta.env.DEV ? missionMarkerState : undefined,
    delivery: import.meta.env.DEV ? deliveryState : undefined,
    proceduralHazards: import.meta.env.DEV ? hazardState : undefined,
    proceduralEvents: import.meta.env.DEV ? eventState : undefined,
    navigation: import.meta.env.DEV ? navigationState : undefined,
    bullGuidanceState: import.meta.env.DEV ? bullGuidanceState : undefined,
    routeNetwork: import.meta.env.DEV ? missionRouteNetwork : undefined,
    junctionGeometry: import.meta.env.DEV
      ? roadGameplay.junctionDebug
      : undefined,
    proceduralVillage: import.meta.env.DEV
      ? {
        ...villageState,
        descriptor: villageDescriptor,
        visual: roadGameplay.villageDebug,
      }
      : undefined,
    directionDialogue: import.meta.env.DEV
      ? directionDialogueState
      : undefined,
  }),
  bullGuidanceState: import.meta.env.DEV ? bullGuidanceState : undefined,
  start: startGame,
};

animate();

const autoTest = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("autotest")
  : null;
if (autoTest) {
  startGame();
  if (
    autoTest === "village"
    || autoTest === "delivery"
    || autoTest === "village-layout"
  ) {
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const villageSection = params.get("section") || "entrance";
      let testRouteDistance = villageDescriptor.deliveryPoint.routeDistance + 0.75;
      let testLateralOffset = villageDescriptor.deliveryPoint.lateralOffset;
      if (autoTest === "village-layout") {
        testLateralOffset = 0;
        if (villageSection === "center") {
          testRouteDistance = villageDescriptor.square.routeDistance - 9;
        } else if (villageSection === "delivery") {
          testRouteDistance = villageDescriptor.deliveryPoint.routeDistance - 12;
        } else {
          testRouteDistance = villageDescriptor.entrance.routeDistance + 4;
        }
      }
      sampleRouteDistance(
        testRouteDistance,
        state.mission.level,
        missionRouteSample,
      );
      cart.position.set(
        missionRouteSample.centerX
          + missionRouteSample.normalX * testLateralOffset,
        missionRouteSample.centerY + CART_ROAD_CLEARANCE,
        missionRouteSample.centerZ
          + missionRouteSample.normalZ * testLateralOffset,
      );
      state.heading = Math.atan2(
        missionRouteSample.tangentX,
        missionRouteSample.tangentZ,
      );
      cart.rotation.y = state.heading;
      navigationState.currentRouteId = missionRouteNetwork.destinationRouteId;
      navigationState.correctRouteId = missionRouteNetwork.destinationRouteId;
      if (autoTest === "delivery") {
        setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent("keydown", {
            code: "KeyE",
            bubbles: true,
          }));
        }, 180);
      }
    }, 120);
  } else if (autoTest === "activity") {
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedIndex = Number.parseInt(params.get("zone") || "0", 10);
      const activityChunks = worldGenerator.chunkManager.chunks
        .filter((chunk) => (
          chunk.group.visible
          && Number.isFinite(chunk.activityRouteDistance)
          && chunk.activityType !== "None"
          && chunk.activityRouteDistance > routeState.startRouteDistance + 15
        ))
        .sort((a, b) => a.activityRouteDistance - b.activityRouteDistance);
      const activityChunk = activityChunks[
        THREE.MathUtils.clamp(
          Number.isFinite(requestedIndex) ? requestedIndex : 0,
          0,
          Math.max(0, activityChunks.length - 1),
        )
      ];
      if (!activityChunk) return;
      checkpointMessage.textContent = `AMBIENT TEST • ${activityChunk.activityType}`;
      checkpointMessage.classList.remove("hidden");
      sampleRouteDistance(
        activityChunk.activityRouteDistance - 38,
        state.mission.level,
        missionRouteSample,
      );
      cart.position.set(
        missionRouteSample.centerX,
        missionRouteSample.centerY + CART_ROAD_CLEARANCE,
        missionRouteSample.centerZ,
      );
      state.heading = Math.atan2(
        missionRouteSample.tangentX,
        missionRouteSample.tangentZ,
      );
      cart.rotation.y = state.heading;
    }, 140);
  } else if (autoTest === "junction") {
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedIndex = Number.parseInt(params.get("junction") || "0", 10);
      const junctionIndex = THREE.MathUtils.clamp(
        Number.isFinite(requestedIndex) ? requestedIndex : 0,
        0,
        Math.max(0, missionRouteNetwork.junctionCount - 1),
      );
      const routeOffset = THREE.MathUtils.clamp(
        Number.parseFloat(params.get("offset") || "-12"),
        -16,
        54,
      );
      const junction = junctionDescriptors[junctionIndex];
      sampleRouteDistance(
        junction.routeDistance + routeOffset,
        state.mission.level,
        missionRouteSample,
      );
      cart.position.set(
        missionRouteSample.centerX,
        missionRouteSample.centerY + CART_ROAD_CLEARANCE,
        missionRouteSample.centerZ,
      );
      state.heading = Math.atan2(
        missionRouteSample.tangentX,
        missionRouteSample.tangentZ,
      );
      cart.rotation.y = state.heading;
      navigationState.currentRouteId = junction.incomingRouteId;
      navigationState.correctRouteId = junction.incomingRouteId;
      const driveDirection = (params.get("drive") || "").toUpperCase();
      const canDriveRequestedBranch = junction.outgoingRoutes.some(
        (route) => route.direction === driveDirection,
      );
      if (driveDirection === "" || canDriveRequestedBranch) {
        for (let index = 0; index < 4; index += 1) {
          window.dispatchEvent(new KeyboardEvent("keydown", {
            code: "ArrowUp",
            bubbles: true,
          }));
        }
        const steerCode = driveDirection === "LEFT"
          ? "ArrowLeft"
          : driveDirection === "RIGHT" ? "ArrowRight" : "";
        const steerDuration = THREE.MathUtils.clamp(
          Number.parseInt(params.get("steer") || "1500", 10),
          600,
          3000,
        );
        if (steerCode) {
          window.dispatchEvent(new KeyboardEvent("keydown", {
            code: steerCode,
            bubbles: true,
          }));
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent("keyup", {
              code: steerCode,
              bubbles: true,
            }));
          }, steerDuration);
        }
        setTimeout(() => {
          document.body.dataset.junctionDriveTest = JSON.stringify({
            requestedDirection: driveDirection || "NATURAL",
            selectedDirection: navigationState.branchDirection,
            selectedJunctionId: navigationState.selectedJunctionId,
            currentRouteId: navigationState.currentRouteId,
            candidateRouteId: navigationState.candidateRouteId,
            branchCommitted: navigationState.branchCommitted,
            correctRouteId: navigationState.correctRouteId,
            isOnWrongRoute: navigationState.isOnWrongRoute,
            physicalRouteDistance: navigationState.physicalRouteDistance,
            currentRouteDistance: routeState.currentRouteDistance,
            wrongRouteTravelDistance: navigationState.wrongRouteTravelDistance,
            branchSeparationDistance: navigationState.branchSeparationDistance,
            distanceFromJunction: navigationState.distanceFromJunction,
            speed: state.speed,
            terrainPitch: state.terrainPitch,
            cartY: cart.position.y,
            roadHeight: currentRoadSample.height,
            roadZone: roadState.zone,
            collisionStrength: state.collisionStrength,
            playerHeading: state.heading,
            roadTangentHeading: state.roadHeading,
            headingAssistAmount: state.headingAssistAmount,
            autoSteerAmount: state.autoSteerAmount,
            lateralRecenteringForce: state.lateralRecenteringForce,
            cameraFar: camera.far,
            fogNear: scene.fog?.near ?? 0,
            fogFar: scene.fog?.far ?? 0,
            visibleChunkCount: worldGenerator.debug.loadedChunks,
          });
        }, 12000);
      }
    }, 120);
  } else {
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
