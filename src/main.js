import * as THREE from "three";
import "./style.css";
import { Controls } from "./controls.js";
import { animateCart, createBullockCart } from "./cart.js";
import { createWorld } from "./world.js";

const root = document.querySelector("#canvas-root");
const startScreen = document.querySelector("#start-screen");
const playButton = document.querySelector("#play-button");
const hud = document.querySelector("#hud");
const hint = document.querySelector("#hint");
const touchControls = document.querySelector("#touch-controls");
const distanceLabel = document.querySelector("#distance");
const speedLabel = document.querySelector("#speed");

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

const { obstacles, sun } = createWorld(scene);
const { group: cart, animationParts } = createBullockCart();
cart.position.set(0, 0.05, -20);
scene.add(cart);

const controls = new Controls(document);
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
  elapsed: 0,
  collisionPulse: 0,
};

const tuning = {
  maxForward: 5.2,
  maxReverse: -1.55,
  acceleration: 1.65,
  braking: 2.75,
  rollingDrag: 0.72,
  steering: 0.52,
};

camera.position.set(0, 8.5, -33);
camera.lookAt(0, 1.3, -14);

function damp(current, target, smoothing, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

function obstacleHit(nextX, nextZ) {
  return obstacles.some((obstacle) => {
    const dx = nextX - obstacle.x;
    const dz = nextZ - obstacle.z;
    return dx * dx + dz * dz < (obstacle.radius + 1.65) ** 2;
  });
}

function updateMovement(delta) {
  const input = controls.state;

  if (input.forward) {
    state.speed += tuning.acceleration * delta;
  } else if (input.brake) {
    if (state.speed > 0.08) state.speed -= tuning.braking * delta;
    else state.speed -= tuning.acceleration * 0.6 * delta;
  } else {
    state.speed = damp(state.speed, 0, tuning.rollingDrag, delta);
  }

  state.speed = THREE.MathUtils.clamp(state.speed, tuning.maxReverse, tuning.maxForward);
  if (Math.abs(state.speed) < 0.015 && !input.forward && !input.brake) state.speed = 0;

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

  if (obstacleHit(nextX, nextZ)) {
    state.speed *= -0.12;
    state.collisionPulse = 0.16;
  } else {
    cart.position.x = THREE.MathUtils.clamp(nextX, -125, 125);
    cart.position.z = THREE.MathUtils.clamp(nextZ, -345, 495);
    if (state.speed > 0) state.distance += Math.abs(moveDistance);
  }

  cart.rotation.y = state.heading;
  cart.rotation.z = damp(cart.rotation.z, -steerInput * speedRatio * 0.035, 5, delta);
  cart.position.y = 0.05 + Math.sin(state.elapsed * 7.5) * speedRatio * 0.018;

  animateCart(animationParts, state.speed, state.elapsed, delta);
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
    state.collisionPulse -= delta;
    chasePosition.x += (Math.random() - 0.5) * 0.25;
    chasePosition.y += (Math.random() - 0.5) * 0.18;
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
  distanceLabel.textContent = state.distance < 1000
    ? `${Math.floor(state.distance)} m`
    : `${(state.distance / 1000).toFixed(2)} km`;
  speedLabel.textContent = `${Math.abs(state.speed * 3.6).toFixed(1)} km/h`;
  if (import.meta.env.DEV) {
    document.body.dataset.gameState = JSON.stringify({
      started: state.started,
      speed: Number(state.speed.toFixed(3)),
      distance: Number(state.distance.toFixed(3)),
      cart: cart.position.toArray().map((value) => Number(value.toFixed(3))),
      camera: camera.position.toArray().map((value) => Number(value.toFixed(3))),
      heading: Number(state.heading.toFixed(3)),
    });
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  state.elapsed += delta;
  if (state.started) updateMovement(delta);
  updateCamera(delta);
  updateHud();
  renderer.render(scene, camera);
  previousPosition.copy(cart.position);
  requestAnimationFrame(animate);
}

function startGame() {
  state.started = true;
  startScreen.classList.add("is-hidden");
  hud.classList.remove("hidden");
  hint.classList.remove("hidden");
  touchControls.classList.remove("hidden");
  playButton.blur();
  setTimeout(() => hint.classList.add("hidden"), 7000);
}

playButton.addEventListener("click", startGame);
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
    cartPosition: cart.position.toArray(),
    cartHeading: state.heading,
    cameraPosition: camera.position.toArray(),
    controls: { ...controls.state },
  }),
  start: startGame,
};

animate();

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("autotest")) {
  startGame();
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }));
  setTimeout(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft", bubbles: true }));
  }, 550);
  setTimeout(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", bubbles: true }));
  }, 1600);
}
