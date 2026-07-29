import * as THREE from "three";

export const CARGO_TYPES = Object.freeze({
  rice: Object.freeze({
    label: "Rice Sacks",
    fragility: 0.72,
    recovery: 1.12,
    movement: 0.58,
    stiffness: 31,
    damping: 10.5,
  }),
  milk: Object.freeze({
    label: "Milk Cans",
    fragility: 0.96,
    recovery: 1,
    movement: 0.88,
    stiffness: 27,
    damping: 9.4,
  }),
  clay: Object.freeze({
    label: "Clay Pots",
    fragility: 1.34,
    recovery: 0.82,
    movement: 1.12,
    stiffness: 23,
    damping: 8.2,
  }),
  vegetables: Object.freeze({
    label: "Vegetables",
    fragility: 0.9,
    recovery: 1.05,
    movement: 1.18,
    stiffness: 25,
    damping: 8.8,
  }),
  wood: Object.freeze({
    label: "Wood Logs",
    fragility: 0.82,
    recovery: 0.92,
    movement: 0.7,
    stiffness: 19,
    damping: 10.8,
  }),
});

const STATUS_SAFE = "safe";
const STATUS_WARNING = "warning";
const STATUS_CRITICAL = "critical";
const STATUS_LOST = "lost";

function cargoConfig(type) {
  return CARGO_TYPES[type] || CARGO_TYPES.rice;
}

export class CargoStabilityManager {
  constructor(type = "rice", difficulty = 1) {
    this.type = type;
    this.config = cargoConfig(type);
    this.difficulty = difficulty;
    this.stability = 100;
    this.damage = 0;
    this.damageRate = 0;
    this.status = STATUS_SAFE;
    this.suspensionForce = 0;
    this.roadRoughness = 0;
    this.turnStrength = 0;
    this.justLost = false;
  }

  reset(type = this.type, difficulty = this.difficulty) {
    this.type = type;
    this.config = cargoConfig(type);
    this.difficulty = Math.max(1, difficulty);
    this.stability = 100;
    this.damage = 0;
    this.damageRate = 0;
    this.status = STATUS_SAFE;
    this.suspensionForce = 0;
    this.roadRoughness = 0;
    this.turnStrength = 0;
    this.justLost = false;
  }

  update(delta, acceleration, speedRatio, signedTurn, roadRoughness, impactSeverity, suspensionY) {
    this.justLost = false;
    this.turnStrength = signedTurn;
    this.roadRoughness = THREE.MathUtils.clamp(
      roadRoughness * (0.92 + this.difficulty * 0.08),
      0,
      1.35,
    );
    this.suspensionForce = Math.abs(suspensionY) * 32 + this.roadRoughness * speedRatio;

    const hardAcceleration = THREE.MathUtils.clamp((acceleration - 0.78) / 0.67, 0, 1);
    const hardBraking = THREE.MathUtils.clamp((-acceleration - 0.88) / 0.92, 0, 1);
    const sharpTurn = THREE.MathUtils.clamp((Math.abs(signedTurn) - 0.42) / 0.58, 0, 1);
    const maxSpeedBumps =
      THREE.MathUtils.clamp((speedRatio - 0.78) / 0.22, 0, 1)
      * THREE.MathUtils.clamp((this.roadRoughness - 0.16) / 0.65, 0, 1);
    const continuousDamage =
      hardAcceleration * 1.35
      + hardBraking * 1.7
      + sharpTurn * 1.45
      + maxSpeedBumps * 2.25;
    const difficultyScale = 0.94 + (this.difficulty - 1) * 0.09;
    this.damageRate = continuousDamage * this.config.fragility * difficultyScale;

    let stabilityChange = -this.damageRate * delta;
    if (impactSeverity > 0) {
      stabilityChange -=
        (5.5 + impactSeverity * 8.5)
        * this.config.fragility
        * difficultyScale;
    }

    const smoothDriving =
      continuousDamage < 0.08
      && Math.abs(acceleration) < 0.48
      && Math.abs(signedTurn) < 0.22
      && this.roadRoughness < 0.3;
    if (smoothDriving && speedRatio > 0.05) {
      stabilityChange += 0.72 * this.config.recovery * delta;
    }

    const previous = this.stability;
    this.stability = THREE.MathUtils.clamp(this.stability + stabilityChange, 0, 100);
    this.damage = 100 - this.stability;
    if (this.stability >= 70) this.status = STATUS_SAFE;
    else if (this.stability >= 40) this.status = STATUS_WARNING;
    else if (this.stability >= 10) this.status = STATUS_CRITICAL;
    else this.status = STATUS_LOST;
    this.justLost = previous > 0 && this.stability === 0;
  }
}

export class CargoAnimationManager {
  constructor(cargoRoot, cargoGroups, animationParts) {
    this.root = cargoRoot;
    this.groups = cargoGroups;
    this.parts = animationParts;
    this.type = "rice";
    this.config = CARGO_TYPES.rice;
    this.offsetX = 0;
    this.offsetY = 0;
    this.pitch = 0;
    this.roll = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.pitchVelocity = 0;
    this.rollVelocity = 0;
    this.impactImpulse = 0;
    this.lookBackTimer = 3.5;
    this.lookBackAmount = 0;
    this.driverLean = 0;
    this.driverWorry = 0;
    this.reinPull = 0;
    this.setCargoType("rice");
  }

  setCargoType(type) {
    this.type = this.groups[type] ? type : "rice";
    this.config = cargoConfig(this.type);
    Object.keys(this.groups).forEach((key) => {
      this.groups[key].visible = key === this.type;
    });
  }

  reset(type = this.type) {
    this.setCargoType(type);
    this.offsetX = 0;
    this.offsetY = 0;
    this.pitch = 0;
    this.roll = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.pitchVelocity = 0;
    this.rollVelocity = 0;
    this.impactImpulse = 0;
    this.lookBackTimer = 3.5;
    this.lookBackAmount = 0;
    this.driverLean = 0;
    this.driverWorry = 0;
    this.reinPull = 0;
    this.root.position.set(0, 1.72, -2.2);
    this.root.rotation.set(0, 0, 0);
  }

  spring(current, velocity, target, stiffness, damping, delta) {
    const nextVelocity = velocity + ((target - current) * stiffness - velocity * damping) * delta;
    return current + nextVelocity * delta;
  }

  update(delta, elapsed, acceleration, signedTurn, roughness, impactSeverity, stabilityStatus) {
    if (impactSeverity > 0) {
      this.impactImpulse = Math.max(this.impactImpulse, impactSeverity);
      this.velocityY += impactSeverity * 0.5 * this.config.movement;
      this.rollVelocity += signedTurn * 0.08 + impactSeverity * 0.025;
    }

    const movement = this.config.movement;
    const bounceWave =
      (Math.sin(elapsed * 11.3) + Math.sin(elapsed * 17.7 + 0.8) * 0.42)
      * roughness
      * 0.018
      * movement;
    const targetX = THREE.MathUtils.clamp(-signedTurn * 0.12 * movement, -0.17, 0.17);
    const targetY = THREE.MathUtils.clamp(bounceWave, -0.035, 0.12);
    const targetPitch = THREE.MathUtils.clamp(-acceleration * 0.045 * movement, -0.105, 0.105);
    const targetRoll = THREE.MathUtils.clamp(-signedTurn * 0.1 * movement, -0.115, 0.115);
    const stiffness = this.config.stiffness;
    const damping = this.config.damping;

    const nextX = this.spring(this.offsetX, this.velocityX, targetX, stiffness, damping, delta);
    this.velocityX += ((targetX - this.offsetX) * stiffness - this.velocityX * damping) * delta;
    this.offsetX = THREE.MathUtils.clamp(nextX, -0.19, 0.19);
    const nextY = this.spring(this.offsetY, this.velocityY, targetY, stiffness * 1.18, damping, delta);
    this.velocityY += ((targetY - this.offsetY) * stiffness * 1.18 - this.velocityY * damping) * delta;
    this.offsetY = THREE.MathUtils.clamp(nextY, -0.045, 0.15);
    const nextPitch = this.spring(
      this.pitch,
      this.pitchVelocity,
      targetPitch,
      stiffness * 0.86,
      damping,
      delta,
    );
    this.pitchVelocity +=
      ((targetPitch - this.pitch) * stiffness * 0.86 - this.pitchVelocity * damping) * delta;
    this.pitch = THREE.MathUtils.clamp(nextPitch, -0.12, 0.12);
    const nextRoll = this.spring(
      this.roll,
      this.rollVelocity,
      targetRoll,
      stiffness * 0.82,
      damping,
      delta,
    );
    this.rollVelocity +=
      ((targetRoll - this.roll) * stiffness * 0.82 - this.rollVelocity * damping) * delta;
    this.roll = THREE.MathUtils.clamp(nextRoll, -0.13, 0.13);
    this.impactImpulse = Math.max(0, this.impactImpulse - delta * 2.8);

    this.root.position.x = this.offsetX;
    this.root.position.y = 1.72 + this.offsetY;
    this.root.position.z = -2.2;
    this.root.rotation.x = this.pitch;
    this.root.rotation.z = this.roll;

    const warning = stabilityStatus === STATUS_WARNING;
    const critical = stabilityStatus === STATUS_CRITICAL || stabilityStatus === STATUS_LOST;
    this.lookBackTimer -= delta;
    let lookTarget = 0;
    if (warning && this.lookBackTimer <= 0) {
      this.lookBackTimer = 4.8;
      this.lookBackAmount = 1;
    }
    this.lookBackAmount = Math.max(0, this.lookBackAmount - delta * 0.72);
    if (warning && this.lookBackAmount > 0.28) lookTarget = -0.46;
    if (critical) lookTarget = -0.2;
    this.lookBackAmount = THREE.MathUtils.lerp(
      this.lookBackAmount,
      Math.max(0, this.lookBackAmount),
      1 - Math.exp(-4 * delta),
    );
    this.driverLean = THREE.MathUtils.lerp(
      this.driverLean,
      THREE.MathUtils.clamp(acceleration * 0.028, -0.035, 0.045),
      1 - Math.exp(-5 * delta),
    );
    this.driverWorry = THREE.MathUtils.lerp(
      this.driverWorry,
      critical ? 1 : 0,
      1 - Math.exp(-3.2 * delta),
    );
    this.reinPull = THREE.MathUtils.lerp(
      this.reinPull,
      acceleration < -0.92 ? 0.065 : 0,
      1 - Math.exp(-7 * delta),
    );
    this.parts.cargoDriverLean = this.driverLean;
    this.parts.cargoHeadTurn = THREE.MathUtils.lerp(
      this.parts.cargoHeadTurn,
      lookTarget,
      1 - Math.exp(-3.6 * delta),
    );
    this.parts.cargoDriverWorry = this.driverWorry;
    this.parts.cargoReinPull = this.reinPull;
  }
}

export class CargoPhysicsManager {
  constructor(cargoRoot, cargoGroups, animationParts) {
    this.stability = new CargoStabilityManager();
    this.animation = new CargoAnimationManager(cargoRoot, cargoGroups, animationParts);
    this.elapsed = 0;
  }

  reset(type = "rice", difficulty = 1) {
    this.elapsed = 0;
    this.stability.reset(type, difficulty);
    this.animation.reset(type);
  }

  update(
    delta,
    acceleration,
    speedRatio,
    signedTurn,
    roadRoughness,
    impactSeverity,
    suspensionY,
  ) {
    this.elapsed += delta;
    this.stability.update(
      delta,
      acceleration,
      speedRatio,
      signedTurn,
      roadRoughness,
      impactSeverity,
      suspensionY,
    );
    this.animation.update(
      delta,
      this.elapsed,
      acceleration,
      signedTurn,
      roadRoughness,
      impactSeverity,
      this.stability.status,
    );
  }
}
