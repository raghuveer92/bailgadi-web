import * as THREE from "three";
import { MAX_CART_SPEED } from "./controls.js";

const DUST_COLOR = new THREE.Color(0xb99763);
const HOOF_ANCHORS = [
  [-1.51, 0.1, 4.73], [-0.65, 0.1, 4.73],
  [-1.51, 0.1, 3.27], [-0.65, 0.1, 3.27],
  [0.65, 0.1, 4.73], [1.51, 0.1, 4.73],
  [0.65, 0.1, 3.27], [1.51, 0.1, 3.27],
];
const WHEEL_ANCHORS = [
  [-2.08, 0.13, -2.06],
  [2.08, 0.13, -2.06],
];

export class DustSystem {
  constructor(scene) {
    this.count = window.matchMedia("(pointer: coarse)").matches ? 48 : 72;
    this.cursor = 0;
    this.spawnAccumulator = 0;
    this.particles = Array.from({ length: this.count }, () => ({
      active: false,
      life: 0,
      maxLife: 1,
      velocity: new THREE.Vector3(),
    }));

    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    for (let index = 0; index < this.count; index += 1) {
      this.positions[index * 3 + 1] = -100;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.38,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update({ cart, speed, travelledDistance, delta }) {
    const movement = Math.min(Math.abs(speed) / MAX_CART_SPEED, 1);
    const travelled = Math.abs(travelledDistance);
    if (movement > 0.04 && travelled > 0) {
      this.spawnAccumulator += travelled * (0.8 + movement * 1.8);
      while (this.spawnAccumulator >= 1) {
        this.spawn(cart, speed, movement);
        this.spawnAccumulator -= 1;
      }
    }

    for (let index = 0; index < this.count; index += 1) {
      const particle = this.particles[index];
      if (!particle.active) continue;

      particle.life -= delta;
      if (particle.life <= 0) {
        particle.active = false;
        this.positions[index * 3 + 1] = -100;
        this.colors[index * 3] = 0;
        this.colors[index * 3 + 1] = 0;
        this.colors[index * 3 + 2] = 0;
        continue;
      }

      const positionIndex = index * 3;
      this.positions[positionIndex] += particle.velocity.x * delta;
      this.positions[positionIndex + 1] += particle.velocity.y * delta;
      this.positions[positionIndex + 2] += particle.velocity.z * delta;
      particle.velocity.y += 0.035 * delta;
      particle.velocity.multiplyScalar(1 - Math.min(delta * 0.65, 0.2));

      const strength = Math.max(0, particle.life / particle.maxLife);
      this.colors[positionIndex] = DUST_COLOR.r * strength;
      this.colors[positionIndex + 1] = DUST_COLOR.g * strength;
      this.colors[positionIndex + 2] = DUST_COLOR.b * strength;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  spawn(cart, speed, movement) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const particle = this.particles[index];
    const useHoof = Math.random() < 0.68;
    const anchors = useHoof ? HOOF_ANCHORS : WHEEL_ANCHORS;
    const anchor = anchors[Math.floor(Math.random() * anchors.length)];

    const worldPosition = new THREE.Vector3(
      anchor[0] + (Math.random() - 0.5) * 0.24,
      anchor[1] + Math.random() * 0.07,
      anchor[2] + (Math.random() - 0.5) * 0.2,
    );
    cart.localToWorld(worldPosition);

    const direction = speed >= 0 ? -1 : 1;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.34,
      0.12 + Math.random() * 0.18,
      direction * (0.28 + movement * 0.42 + Math.random() * 0.18),
    ).applyQuaternion(cart.quaternion);

    const positionIndex = index * 3;
    this.positions[positionIndex] = worldPosition.x;
    this.positions[positionIndex + 1] = worldPosition.y;
    this.positions[positionIndex + 2] = worldPosition.z;
    particle.active = true;
    particle.maxLife = 0.65 + Math.random() * 0.45;
    particle.life = particle.maxLife;
    particle.velocity.copy(velocity);
  }

  getActiveCount() {
    return this.particles.reduce((total, particle) => total + Number(particle.active), 0);
  }

  reset() {
    this.spawnAccumulator = 0;
    this.particles.forEach((particle, index) => {
      particle.active = false;
      particle.life = 0;
      this.positions[index * 3 + 1] = -100;
      this.colors[index * 3] = 0;
      this.colors[index * 3 + 1] = 0;
      this.colors[index * 3 + 2] = 0;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
