import * as THREE from "three";

export const ANIMAL_STATES = Object.freeze({
  IDLE: "Idle",
  GRAZING: "Grazing",
  WALKING: "Walking",
  CROSSING: "Crossing Road",
  LOOKING: "Looking Around",
  SLEEPING: "Sleeping",
  PECKING: "Pecking",
  SCATTERING: "Scattering",
});

export const NPC_STATES = Object.freeze({
  WALKING: "Walking",
  CARRYING: "Carrying Baskets",
  TALKING: "Talking",
  SITTING: "Sitting",
  SWEEPING: "Sweeping",
  FIELD_WORK: "Working in Fields",
  STANDING: "Standing Near Houses",
  WATER: "Fetching Water",
  WATCHING: "Watching Cart",
  AVOIDING: "Avoiding Cart",
  RUNNING: "Running Alongside",
});

const SPAWN_RADIUS = 112;
const DESPAWN_RADIUS = 145;
const ROAD_EDGE = 10.5;
const SAFE_ROAD_EDGE = 13.5;

function distanceSquaredXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function damp(current, target, smoothing, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

function turnTowardCoordinates(object, x, z, delta, smoothing = 3.2) {
  const targetAngle = Math.atan2(x - object.position.x, z - object.position.z);
  const difference = Math.atan2(
    Math.sin(targetAngle - object.rotation.y),
    Math.cos(targetAngle - object.rotation.y),
  );
  object.rotation.y += difference * (1 - Math.exp(-smoothing * delta));
}

function moveToward(actor, speed, delta) {
  const root = actor.root;
  const dx = actor.target.x - root.position.x;
  const dz = actor.target.z - root.position.z;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared < 0.08) return true;
  const inverseDistance = 1 / Math.sqrt(distanceSquared);
  const step = Math.min(speed * delta, Math.sqrt(distanceSquared));
  root.position.x += dx * inverseDistance * step;
  root.position.z += dz * inverseDistance * step;
  turnTowardCoordinates(root, actor.target.x, actor.target.z, delta, 5);
  return false;
}

export class SpawnManager {
  constructor(actors, spawnRadius = SPAWN_RADIUS, despawnRadius = DESPAWN_RADIUS) {
    this.actors = actors;
    this.spawnRadius = spawnRadius;
    this.despawnRadius = despawnRadius;
    this.spawnRadiusSquared = spawnRadius * spawnRadius;
    this.despawnRadiusSquared = despawnRadius * despawnRadius;
    this.activeNPCs = 0;
    this.activeAnimals = 0;
    this.spawnedObjects = 0;
    this.poolUsage = 0;
    this.totalPoolSize = actors.length;
    actors.forEach((actor) => {
      actor.active = false;
      actor.root.visible = false;
    });
  }

  update(cartPosition) {
    let activeNPCs = 0;
    let activeAnimals = 0;
    for (let index = 0; index < this.actors.length; index += 1) {
      const actor = this.actors[index];
      const anchor = actor.home || actor.root.position;
      const distanceSquared = distanceSquaredXZ(anchor, cartPosition);
      if (!actor.active && distanceSquared <= this.spawnRadiusSquared) {
        actor.active = true;
        actor.root.visible = true;
      } else if (actor.active && distanceSquared > this.despawnRadiusSquared) {
        actor.active = false;
        actor.root.visible = false;
      }
      if (!actor.active) continue;
      if (actor.poolKind === "npc") activeNPCs += 1;
      else activeAnimals += 1;
    }
    this.activeNPCs = activeNPCs;
    this.activeAnimals = activeAnimals;
    this.spawnedObjects = activeNPCs + activeAnimals;
    this.poolUsage = this.totalPoolSize > 0
      ? this.spawnedObjects / this.totalPoolSize
      : 0;
  }

  reset() {
    this.actors.forEach((actor) => {
      actor.active = false;
      actor.root.visible = false;
    });
    this.activeNPCs = 0;
    this.activeAnimals = 0;
    this.spawnedObjects = 0;
    this.poolUsage = 0;
  }
}

export class NPCManager {
  constructor(villagers, random, ambientEvents) {
    this.villagers = villagers;
    this.random = random;
    this.ambientEvents = ambientEvents;
    this.extensions = new Map();
    const activities = [
      NPC_STATES.WALKING,
      NPC_STATES.CARRYING,
      NPC_STATES.TALKING,
      NPC_STATES.SITTING,
      NPC_STATES.SWEEPING,
      NPC_STATES.FIELD_WORK,
      NPC_STATES.STANDING,
      NPC_STATES.WATER,
    ];
    villagers.forEach((villager, index) => {
      villager.poolKind = "npc";
      villager.state = activities[index % activities.length];
      villager.previousState = villager.state;
      villager.stateTimer = 5 + random() * 9;
      villager.target = new THREE.Vector3();
      villager.target.copy(villager.home);
      villager.waypointIndex = 0;
      villager.waveTimer = 2 + random() * 7;
      villager.runTimer = 0;
      villager.safetySide = Math.sign(villager.home.x) || (index % 2 ? 1 : -1);
      villager.activityIndex = index % activities.length;
      villager.walkSpeed = villager.kind === "child" ? 1.25 : 0.62 + random() * 0.2;
      villager.waypoints = [
        new THREE.Vector3(
          villager.home.x,
          0,
          villager.home.z - 2.2 - random() * 2,
        ),
        new THREE.Vector3(
          villager.home.x + villager.safetySide * (1.4 + random() * 1.8),
          0,
          villager.home.z + 2 + random() * 2.5,
        ),
      ];
    });
  }

  registerActivity(name, handler) {
    this.extensions.set(name, handler);
  }

  chooseNextActivity(villager) {
    villager.activityIndex = (villager.activityIndex + 1 + Math.floor(this.random() * 3)) % 8;
    const activities = [
      NPC_STATES.WALKING,
      NPC_STATES.CARRYING,
      NPC_STATES.TALKING,
      NPC_STATES.SITTING,
      NPC_STATES.SWEEPING,
      NPC_STATES.FIELD_WORK,
      NPC_STATES.STANDING,
      NPC_STATES.WATER,
    ];
    villager.state = activities[villager.activityIndex];
    villager.previousState = villager.state;
    villager.stateTimer = 7 + this.random() * 12;
    villager.waypointIndex = (villager.waypointIndex + 1) % villager.waypoints.length;
    villager.target.copy(villager.waypoints[villager.waypointIndex]);
  }

  updateVillager(villager, cartPosition, cartSpeed, elapsed, delta) {
    if (!villager.active) return;
    const root = villager.root;
    const dx = root.position.x - cartPosition.x;
    const dz = root.position.z - cartPosition.z;
    const distanceSquared = dx * dx + dz * dz;
    const fastCart = Math.abs(cartSpeed) > 2.15;
    const avoidanceRadius = fastCart ? 18 : 9.5;
    const mustAvoid = distanceSquared < avoidanceRadius * avoidanceRadius;
    const immediateDanger = distanceSquared < 6.5 * 6.5;

    villager.stateTimer -= delta;
    villager.waveTimer -= delta;
    if (mustAvoid) {
      if (villager.state !== NPC_STATES.AVOIDING && villager.state !== NPC_STATES.RUNNING) {
        villager.previousState = villager.state;
      }
      const canRunAlongside =
        villager.kind === "child"
        && !fastCart
        && !immediateDanger
        && Math.abs(root.position.x) >= ROAD_EDGE;
      if (canRunAlongside && villager.runTimer <= 0 && this.random() < delta * 0.16) {
        villager.runTimer = 2.6 + this.random() * 1.8;
      }
      if (villager.runTimer > 0) {
        villager.state = NPC_STATES.RUNNING;
        villager.runTimer -= delta;
        villager.target.set(
          villager.safetySide * SAFE_ROAD_EDGE,
          0,
          cartPosition.z + (cartSpeed >= 0 ? 2.5 : -2.5),
        );
        moveToward(villager, 1.8 + Math.abs(cartSpeed) * 0.22, delta);
      } else {
        villager.state = NPC_STATES.AVOIDING;
        villager.target.set(
          villager.safetySide * (fastCart ? 16.5 : SAFE_ROAD_EDGE),
          0,
          root.position.z + (dz >= 0 ? 1.5 : -1.5),
        );
        moveToward(villager, immediateDanger ? 3.2 : fastCart ? 2.15 : 1.25, delta);
      }
      const cartAngle = Math.atan2(
        cartPosition.x - root.position.x,
        cartPosition.z - root.position.z,
      );
      const relativeLook = Math.atan2(
        Math.sin(cartAngle - root.rotation.y),
        Math.cos(cartAngle - root.rotation.y),
      );
      villager.head.rotation.y = damp(
        villager.head.rotation.y,
        THREE.MathUtils.clamp(relativeLook, -0.62, 0.62),
        4,
        delta,
      );
    } else {
      if (villager.state === NPC_STATES.AVOIDING || villager.state === NPC_STATES.RUNNING) {
        villager.state = villager.previousState;
        villager.target.copy(villager.home);
        villager.stateTimer = 4 + this.random() * 5;
      }
      if (villager.stateTimer <= 0) this.chooseNextActivity(villager);
      const moving =
        villager.state === NPC_STATES.WALKING
        || villager.state === NPC_STATES.CARRYING
        || villager.state === NPC_STATES.WATER;
      if (moving && moveToward(villager, villager.walkSpeed, delta)) {
        villager.waypointIndex = (villager.waypointIndex + 1) % villager.waypoints.length;
        villager.target.copy(villager.waypoints[villager.waypointIndex]);
      }
      const watchingDistance = villager.kind === "child" ? 24 : 19;
      if (distanceSquared < watchingDistance * watchingDistance) {
        turnTowardCoordinates(root, cartPosition.x, cartPosition.z, delta, 1.8);
        villager.head.rotation.y = damp(villager.head.rotation.y, 0, 3, delta);
        if (villager.waveTimer <= 0 && this.random() < delta * 0.22) {
          villager.waveTimer = 7 + this.random() * 8;
          villager.waveAmount = 1;
        }
      } else {
        villager.waveAmount = 0;
      }
    }

    const walking =
      villager.state === NPC_STATES.WALKING
      || villager.state === NPC_STATES.CARRYING
      || villager.state === NPC_STATES.WATER
      || villager.state === NPC_STATES.AVOIDING
      || villager.state === NPC_STATES.RUNNING;
    const strideRate = villager.state === NPC_STATES.RUNNING ? 7.4 : 4.1;
    const strideAmount = villager.state === NPC_STATES.RUNNING ? 0.55 : walking ? 0.34 : 0;
    const stride = Math.sin(elapsed * strideRate + villager.phase) * strideAmount;
    villager.leftArm.rotation.x = -stride;
    villager.rightArm.rotation.x = stride;
    villager.leftLeg.rotation.x = stride;
    villager.rightLeg.rotation.x = -stride;
    villager.body.position.y =
      Math.abs(stride) * 0.025 + Math.sin(elapsed * 1.4 + villager.phase) * 0.008;
    villager.body.rotation.z = 0;

    if (villager.state === NPC_STATES.SWEEPING) {
      villager.rightArm.rotation.x = 0.8 + Math.sin(elapsed * 3.2 + villager.phase) * 0.55;
      villager.body.rotation.z = Math.sin(elapsed * 3.2 + villager.phase) * 0.08;
    } else if (villager.state === NPC_STATES.TALKING) {
      villager.rightArm.rotation.x = -0.45 + Math.sin(elapsed * 2.6 + villager.phase) * 0.32;
      villager.head.rotation.y = Math.sin(elapsed * 0.9 + villager.phase) * 0.18;
    } else if (villager.state === NPC_STATES.FIELD_WORK) {
      villager.body.rotation.x = 0.22 + Math.sin(elapsed * 1.4 + villager.phase) * 0.12;
    } else {
      villager.body.rotation.x = damp(villager.body.rotation.x, 0, 4, delta);
    }
    if (villager.state === NPC_STATES.SITTING) {
      villager.body.position.y -= 0.28;
      villager.leftLeg.rotation.x = -1.05;
      villager.rightLeg.rotation.x = -1.05;
    }
    if (villager.state === NPC_STATES.CARRYING || villager.state === NPC_STATES.WATER) {
      villager.leftArm.rotation.z = -0.42;
      villager.rightArm.rotation.z = 0.42;
    } else {
      villager.leftArm.rotation.z = damp(villager.leftArm.rotation.z, 0, 5, delta);
      villager.rightArm.rotation.z = damp(villager.rightArm.rotation.z, 0, 5, delta);
    }
    if (villager.basket) {
      villager.basket.visible =
        villager.state === NPC_STATES.CARRYING || villager.state === NPC_STATES.WATER;
    }
    if (villager.broom) villager.broom.visible = villager.state === NPC_STATES.SWEEPING;
    if (villager.waveAmount > 0) {
      villager.waveAmount = Math.max(0, villager.waveAmount - delta * 0.55);
      villager.rightArm.rotation.z = -2.25 + Math.sin(elapsed * 7.5 + villager.phase) * 0.4;
    }

    const extension = this.extensions.get(villager.state);
    if (extension) extension(villager, cartPosition, elapsed, delta);
  }

  update(cartPosition, cartSpeed, elapsed, delta) {
    for (let index = 0; index < this.villagers.length; index += 1) {
      this.updateVillager(this.villagers[index], cartPosition, cartSpeed, elapsed, delta);
    }
    if (this.ambientEvents && this.ambientEvents.canPlayNPCFootstep()) {
      for (let index = 0; index < this.villagers.length; index += 1) {
        const villager = this.villagers[index];
        if (villager.active && (
          villager.state === NPC_STATES.WALKING
          || villager.state === NPC_STATES.RUNNING
        )) {
          this.ambientEvents.requestSpatialCue(
            "footsteps",
            villager.root.position,
            cartPosition,
            0.24,
          );
          break;
        }
      }
    }
  }
}

export class AnimalManager {
  constructor(largeAnimals, chickens, random, ambientEvents) {
    this.largeAnimals = largeAnimals;
    this.chickens = chickens;
    this.random = random;
    this.ambientEvents = ambientEvents;
    this.extensions = new Map();
    largeAnimals.forEach((animal, index) => {
      animal.poolKind = "animal";
      animal.home = animal.home || animal.root.position.clone();
      animal.target = new THREE.Vector3().copy(animal.home);
      animal.state = index % 3 === 0 ? ANIMAL_STATES.GRAZING : ANIMAL_STATES.IDLE;
      animal.stateTimer = 6 + random() * 10;
      animal.walkSpeed = animal.kind === "buffalo" ? 0.25 : 0.38;
      animal.safeSide = Math.sign(animal.home.x) || (index % 2 ? 1 : -1);
      animal.waypoints = [
        new THREE.Vector3(animal.home.x - animal.safeSide * 3.5, 0, animal.home.z - 4),
        new THREE.Vector3(animal.home.x + animal.safeSide * 4, 0, animal.home.z + 5),
        new THREE.Vector3(animal.safeSide * ROAD_EDGE, 0, animal.home.z + 2),
      ];
      animal.waypointIndex = index % 2;
      animal.soundTimer = 5 + random() * 14;
    });
    chickens.forEach((chicken, index) => {
      chicken.poolKind = "animal";
      chicken.target = new THREE.Vector3().copy(chicken.home);
      chicken.state = index % 2 ? ANIMAL_STATES.PECKING : ANIMAL_STATES.WALKING;
      chicken.stateTimer = 2 + random() * 4;
      chicken.safeSide = Math.sign(chicken.home.x) || (index % 2 ? 1 : -1);
      chicken.waypoints = [
        new THREE.Vector3(chicken.home.x, 0, chicken.home.z - 2.5),
        new THREE.Vector3(-chicken.safeSide * 12.5, 0, chicken.home.z + 2.5),
        new THREE.Vector3(chicken.safeSide * 14, 0, chicken.home.z + 4),
      ];
      chicken.waypointIndex = 0;
      chicken.soundTimer = 3 + random() * 9;
    });
  }

  registerBehavior(name, handler) {
    this.extensions.set(name, handler);
  }

  chooseLargeAnimalState(animal) {
    const roll = this.random();
    if (animal.kind === "buffalo") {
      if (roll < 0.46) animal.state = ANIMAL_STATES.IDLE;
      else if (roll < 0.76) animal.state = ANIMAL_STATES.GRAZING;
      else if (roll < 0.93) animal.state = ANIMAL_STATES.WALKING;
      else animal.state = ANIMAL_STATES.CROSSING;
    } else if (roll < 0.36) animal.state = ANIMAL_STATES.GRAZING;
    else if (roll < 0.62) animal.state = ANIMAL_STATES.IDLE;
    else if (roll < 0.86) animal.state = ANIMAL_STATES.WALKING;
    else if (roll < 0.95) animal.state = ANIMAL_STATES.LOOKING;
    else animal.state = ANIMAL_STATES.CROSSING;
    animal.stateTimer = 6 + this.random() * 12;
    animal.waypointIndex = (animal.waypointIndex + 1) % animal.waypoints.length;
    if (animal.state === ANIMAL_STATES.CROSSING) {
      animal.target.set(
        animal.kind === "buffalo" ? animal.safeSide * 4.5 : -animal.safeSide * 12.5,
        0,
        animal.home.z + (this.random() - 0.5) * 8,
      );
    } else {
      animal.target.copy(animal.waypoints[animal.waypointIndex]);
    }
  }

  avoidCart(actor, cartPosition, cartSpeed, delta, isChicken = false) {
    const distanceSquared = distanceSquaredXZ(actor.root.position, cartPosition);
    const fast = Math.abs(cartSpeed) > 2.15;
    const radius = isChicken ? (fast ? 20 : 10) : (fast ? 17 : 9);
    if (distanceSquared > radius * radius) return false;
    const side = Math.sign(actor.root.position.x - cartPosition.x) || actor.safeSide || 1;
    actor.state = ANIMAL_STATES.SCATTERING;
    actor.target.set(
      side * (isChicken ? 17 : fast ? 18 : 15),
      0,
      actor.root.position.z + (actor.root.position.z >= cartPosition.z ? 3 : -3),
    );
    moveToward(actor, isChicken ? (fast ? 4.5 : 2.9) : fast ? 1.75 : 1.05, delta);
    return true;
  }

  updateLargeAnimal(animal, cartPosition, cartSpeed, elapsed, delta) {
    if (!animal.active) return;
    animal.stateTimer -= delta;
    animal.soundTimer -= delta;
    const avoiding = this.avoidCart(animal, cartPosition, cartSpeed, delta);
    if (!avoiding) {
      if (animal.state === ANIMAL_STATES.SCATTERING || animal.stateTimer <= 0) {
        this.chooseLargeAnimalState(animal);
      }
      if (
        animal.state === ANIMAL_STATES.WALKING
        || animal.state === ANIMAL_STATES.CROSSING
      ) {
        const arrived = moveToward(animal, animal.walkSpeed, delta);
        if (arrived) animal.stateTimer = 0;
      } else if (animal.state === ANIMAL_STATES.LOOKING) {
        animal.root.rotation.y += Math.sin(elapsed * 0.45 + animal.phase) * delta * 0.08;
      }
    }

    const grazing = animal.state === ANIMAL_STATES.GRAZING;
    const walking =
      animal.state === ANIMAL_STATES.WALKING
      || animal.state === ANIMAL_STATES.CROSSING
      || animal.state === ANIMAL_STATES.SCATTERING;
    animal.head.rotation.x = damp(
      animal.head.rotation.x,
      grazing ? 0.62 : animal.state === ANIMAL_STATES.LOOKING ? 0.08 : 0.22,
      2.4,
      delta,
    );
    animal.head.rotation.y =
      Math.sin(elapsed * 0.55 + animal.phase) * (grazing ? 0.09 : 0.15);
    animal.tail.rotation.z = Math.sin(elapsed * 1.4 + animal.phase) * 0.3;
    if (animal.legs) {
      const stride = Math.sin(elapsed * (animal.kind === "buffalo" ? 2.4 : 3.1) + animal.phase);
      for (let index = 0; index < animal.legs.length; index += 1) {
        animal.legs[index].rotation.x = walking
          ? stride * (index % 2 ? -0.16 : 0.16)
          : 0;
      }
    }
    if (animal.soundTimer <= 0) {
      this.ambientEvents.requestSpatialCue(
        animal.kind === "buffalo" ? "buffalo" : "cow",
        animal.root.position,
        cartPosition,
        0.34,
      );
      animal.soundTimer = 11 + this.random() * 20;
    }
    const extension = this.extensions.get(animal.state);
    if (extension) extension(animal, cartPosition, elapsed, delta);
  }

  chooseChickenState(chicken) {
    const roll = this.random();
    if (roll < 0.42) chicken.state = ANIMAL_STATES.PECKING;
    else if (roll < 0.62) chicken.state = ANIMAL_STATES.IDLE;
    else if (roll < 0.9) chicken.state = ANIMAL_STATES.CROSSING;
    else chicken.state = ANIMAL_STATES.LOOKING;
    chicken.stateTimer = 1.5 + this.random() * 4;
    chicken.waypointIndex = (chicken.waypointIndex + 1) % chicken.waypoints.length;
    if (chicken.state === ANIMAL_STATES.CROSSING) {
      chicken.target.set(
        -chicken.safeSide * 14,
        0,
        chicken.home.z + (this.random() - 0.5) * 8,
      );
    } else {
      chicken.target.copy(chicken.waypoints[chicken.waypointIndex]);
    }
  }

  updateChicken(chicken, cartPosition, cartSpeed, elapsed, delta) {
    if (!chicken.active) return;
    chicken.stateTimer -= delta;
    chicken.soundTimer -= delta;
    const scattering = this.avoidCart(chicken, cartPosition, cartSpeed, delta, true);
    if (!scattering) {
      if (chicken.state === ANIMAL_STATES.SCATTERING || chicken.stateTimer <= 0) {
        this.chooseChickenState(chicken);
      }
      if (chicken.state === ANIMAL_STATES.WALKING || chicken.state === ANIMAL_STATES.CROSSING) {
        if (moveToward(chicken, 0.72, delta)) chicken.stateTimer = 0;
      }
    }
    const pecking = chicken.state === ANIMAL_STATES.PECKING;
    chicken.head.position.y = pecking
      ? 0.48 + Math.abs(Math.sin(elapsed * 6.5 + chicken.phase)) * 0.18
      : 0.66 + Math.sin(elapsed * 3.2 + chicken.phase) * 0.025;
    if (chicken.legs) {
      const stride = Math.sin(elapsed * 7.2 + chicken.phase) * 0.24;
      chicken.legs[0].rotation.x = scattering ? stride : 0;
      chicken.legs[1].rotation.x = scattering ? -stride : 0;
    }
    if (chicken.soundTimer <= 0) {
      this.ambientEvents.requestSpatialCue("chicken", chicken.root.position, cartPosition, 0.22);
      chicken.soundTimer = 7 + this.random() * 13;
    }
  }

  update(cartPosition, cartSpeed, elapsed, delta) {
    for (let index = 0; index < this.largeAnimals.length; index += 1) {
      this.updateLargeAnimal(this.largeAnimals[index], cartPosition, cartSpeed, elapsed, delta);
    }
    for (let index = 0; index < this.chickens.length; index += 1) {
      this.updateChicken(this.chickens[index], cartPosition, cartSpeed, elapsed, delta);
    }
  }
}

const AMBIENT_EVENTS = Object.freeze([
  "Birds Flying Away",
  "Dust Gust",
  "Leaves Blowing",
  "Dog Barking",
  "Cow Mooing",
  "Temple Bell",
  "Farmer Shouting",
  "Distant Cart",
  "Village Announcement",
]);

export class AmbientEventManager {
  constructor(scene, random, windTargets = [], smokeSources = []) {
    this.scene = scene;
    this.random = random;
    this.windTargets = windTargets;
    this.smokeSources = smokeSources;
    this.audioManager = null;
    this.currentEvent = "None";
    this.eventTimer = 8 + random() * 8;
    this.eventDuration = 0;
    this.eventCursor = Math.floor(random() * AMBIENT_EVENTS.length);
    this.lastEvent = "";
    this.audioCooldown = 0;
    this.footstepTimer = 1.5;
    this.extensions = new Map();
    this.createEventPools();
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  registerEvent(name, handler) {
    this.extensions.set(name, handler);
  }

  createEventPools() {
    const birdMaterial = new THREE.MeshBasicMaterial({ color: 0x342f2a, side: THREE.DoubleSide });
    const wingGeometry = new THREE.PlaneGeometry(0.34, 0.09);
    this.birds = new THREE.Group();
    this.birdActors = [];
    for (let index = 0; index < 8; index += 1) {
      const bird = new THREE.Group();
      const leftWing = new THREE.Mesh(wingGeometry, birdMaterial);
      const rightWing = new THREE.Mesh(wingGeometry, birdMaterial);
      leftWing.position.x = -0.17;
      rightWing.position.x = 0.17;
      leftWing.rotation.z = 0.14;
      rightWing.rotation.z = -0.14;
      bird.add(leftWing, rightWing);
      bird.visible = false;
      this.birds.add(bird);
      this.birdActors.push({ root: bird, leftWing, rightWing, phase: index * 0.73 });
    }
    this.scene.add(this.birds);

    const dustCount = 18;
    this.dustPositions = new Float32Array(dustCount * 3);
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute("position", new THREE.BufferAttribute(this.dustPositions, 3));
    this.dust = new THREE.Points(
      this.dustGeometry,
      new THREE.PointsMaterial({
        color: 0xc69a61,
        size: 0.32,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.dust.visible = false;
    this.scene.add(this.dust);

    const leafGeometry = new THREE.PlaneGeometry(0.16, 0.08);
    const leafMaterial = new THREE.MeshBasicMaterial({
      color: 0x6c873b,
      side: THREE.DoubleSide,
    });
    this.leaves = new THREE.Group();
    this.leafActors = [];
    for (let index = 0; index < 12; index += 1) {
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.visible = false;
      this.leaves.add(leaf);
      this.leafActors.push({ root: leaf, phase: index * 0.61 });
    }
    this.scene.add(this.leaves);
  }

  canPlayNPCFootstep() {
    if (this.footstepTimer > 0) return false;
    this.footstepTimer = 2.6;
    return true;
  }

  requestSpatialCue(name, sourcePosition, listenerPosition, volume = 0.3) {
    if (!this.audioManager || this.audioCooldown > 0) return false;
    const dx = sourcePosition.x - listenerPosition.x;
    const dz = sourcePosition.z - listenerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance > 85) return false;
    const played = this.audioManager.playWorldCue(name, dx, distance, volume);
    if (played) this.audioCooldown = name === "footsteps" ? 1.8 : 3.4;
    return played;
  }

  beginEvent(cartPosition) {
    this.eventCursor = (this.eventCursor + 1 + Math.floor(this.random() * 3)) % AMBIENT_EVENTS.length;
    let nextEvent = AMBIENT_EVENTS[this.eventCursor];
    if (nextEvent === this.lastEvent) {
      this.eventCursor = (this.eventCursor + 1) % AMBIENT_EVENTS.length;
      nextEvent = AMBIENT_EVENTS[this.eventCursor];
    }
    this.lastEvent = nextEvent;
    this.currentEvent = nextEvent;
    this.eventDuration = 3.5 + this.random() * 3;
    if (nextEvent === "Birds Flying Away") {
      for (let index = 0; index < this.birdActors.length; index += 1) {
        const bird = this.birdActors[index].root;
        bird.visible = true;
        bird.position.set(
          cartPosition.x - 9 + index * 2.2,
          1.4 + (index % 3) * 0.4,
          cartPosition.z + 26 + (index % 2) * 3,
        );
      }
    } else if (nextEvent === "Dust Gust") {
      this.dust.visible = true;
      this.dust.position.set(cartPosition.x - 12, 0.2, cartPosition.z + 18);
    } else if (nextEvent === "Leaves Blowing") {
      for (let index = 0; index < this.leafActors.length; index += 1) {
        const leaf = this.leafActors[index].root;
        leaf.visible = true;
        leaf.position.set(
          cartPosition.x - 10 + (index % 6) * 3.8,
          0.4 + (index % 4) * 0.45,
          cartPosition.z + 12 + Math.floor(index / 6) * 5,
        );
      }
    } else {
      const cueMap = {
        "Dog Barking": "dog",
        "Cow Mooing": "cow",
        "Temple Bell": "bell",
        "Farmer Shouting": "farmer",
        "Distant Cart": "distantCart",
        "Village Announcement": "announcement",
      };
      const sourceX = cartPosition.x + (this.random() > 0.5 ? 1 : -1) * (18 + this.random() * 30);
      this.requestSpatialCue(
        cueMap[nextEvent],
        { x: sourceX, z: cartPosition.z + 15 + this.random() * 30 },
        cartPosition,
        0.32,
      );
    }
  }

  endEvent() {
    this.currentEvent = "None";
    this.eventTimer = 9 + this.random() * 14;
    for (let index = 0; index < this.birdActors.length; index += 1) {
      this.birdActors[index].root.visible = false;
    }
    for (let index = 0; index < this.leafActors.length; index += 1) {
      this.leafActors[index].root.visible = false;
    }
    this.dust.visible = false;
  }

  updateEventVisuals(elapsed, delta) {
    if (this.currentEvent === "Birds Flying Away") {
      for (let index = 0; index < this.birdActors.length; index += 1) {
        const actor = this.birdActors[index];
        actor.root.position.y += delta * (0.7 + index * 0.03);
        actor.root.position.z += delta * 3.4;
        actor.root.position.x += Math.sin(elapsed * 1.8 + actor.phase) * delta * 0.8;
        const flap = Math.sin(elapsed * 14 + actor.phase) * 0.55;
        actor.leftWing.rotation.x = flap;
        actor.rightWing.rotation.x = -flap;
      }
    } else if (this.currentEvent === "Dust Gust") {
      for (let index = 0; index < this.dustPositions.length / 3; index += 1) {
        const offset = index * 3;
        this.dustPositions[offset] =
          ((index * 1.73 + elapsed * 4.2) % 24) - 12;
        this.dustPositions[offset + 1] =
          0.15 + Math.abs(Math.sin(elapsed * 1.7 + index)) * 1.1;
        this.dustPositions[offset + 2] =
          Math.sin(index * 2.4 + elapsed * 0.8) * 3.2;
      }
      this.dustGeometry.attributes.position.needsUpdate = true;
    } else if (this.currentEvent === "Leaves Blowing") {
      for (let index = 0; index < this.leafActors.length; index += 1) {
        const actor = this.leafActors[index];
        actor.root.position.x += delta * (1.4 + (index % 3) * 0.3);
        actor.root.position.y += Math.sin(elapsed * 3.1 + actor.phase) * delta * 0.5;
        actor.root.rotation.x += delta * (1.8 + index * 0.05);
        actor.root.rotation.z += delta * 2.3;
      }
    }
  }

  updateSmoke(elapsed, delta) {
    for (let sourceIndex = 0; sourceIndex < this.smokeSources.length; sourceIndex += 1) {
      const source = this.smokeSources[sourceIndex];
      for (let index = 0; index < source.particles.length; index += 1) {
        const particle = source.particles[index];
        particle.life = (particle.life + delta * 0.09) % 1;
        const height = particle.life * 4;
        const positionIndex = index * 3;
        source.positions[positionIndex] =
          Math.sin(elapsed * 0.25 + source.phase + particle.life * 3) * 0.24
          + particle.offset;
        source.positions[positionIndex + 1] = height;
        source.positions[positionIndex + 2] =
          particle.life * 0.55 + Math.cos(elapsed * 0.2 + index) * 0.08;
        source.alphas[index] = Math.sin(particle.life * Math.PI) * 0.72;
      }
      source.smoke.geometry.attributes.position.needsUpdate = true;
      source.smoke.geometry.attributes.alpha.needsUpdate = true;
    }
  }

  updateWind(cartPosition, elapsed) {
    for (let index = 0; index < this.windTargets.length; index += 1) {
      const target = this.windTargets[index];
      const dx = target.worldX - cartPosition.x;
      const dz = target.worldZ - cartPosition.z;
      if (dx * dx + dz * dz > target.range * target.range) continue;
      const eventBoost = this.currentEvent === "Leaves Blowing" ? 1.75 : 1;
      const sway = Math.sin(elapsed * target.speed + target.phase);
      target.object.rotation.z = target.baseZ + sway * target.amount * eventBoost;
      target.object.rotation.x =
        target.baseX
        + Math.cos(elapsed * target.speed * 0.7 + target.phase)
          * target.amount
          * 0.35
          * eventBoost;
    }
  }

  update(cartPosition, elapsed, delta) {
    this.audioCooldown = Math.max(0, this.audioCooldown - delta);
    this.footstepTimer = Math.max(-0.1, this.footstepTimer - delta);
    if (this.currentEvent === "None") {
      this.eventTimer -= delta;
      if (this.eventTimer <= 0) this.beginEvent(cartPosition);
    } else {
      this.eventDuration -= delta;
      this.updateEventVisuals(elapsed, delta);
      const extension = this.extensions.get(this.currentEvent);
      if (extension) extension(cartPosition, elapsed, delta);
      if (this.eventDuration <= 0) this.endEvent();
    }
    this.updateSmoke(elapsed, delta);
    this.updateWind(cartPosition, elapsed);
  }
}

export class DynamicWorldAI {
  constructor({
    scene,
    villagers,
    animals,
    chickens,
    random,
    windTargets,
    smokeSources,
  }) {
    this.ambientEvents = new AmbientEventManager(scene, random, windTargets, smokeSources);
    this.npcManager = new NPCManager(villagers, random, this.ambientEvents);
    this.animalManager = new AnimalManager(animals, chickens, random, this.ambientEvents);
    this.spawnManager = new SpawnManager([...villagers, ...animals, ...chickens]);
    this.averageUpdateTime = 0;
    this.debug = {
      activeNPCs: 0,
      activeAnimals: 0,
      spawnedObjects: 0,
      poolUsage: 0,
      currentAmbientEvent: "None",
      averageNPCUpdateTime: 0,
    };
  }

  setAudioManager(audioManager) {
    this.ambientEvents.setAudioManager(audioManager);
  }

  update(cartPosition, cartSpeed, elapsed, delta) {
    this.spawnManager.update(cartPosition);
    const start = performance.now();
    this.npcManager.update(cartPosition, cartSpeed, elapsed, delta);
    const duration = performance.now() - start;
    this.animalManager.update(cartPosition, cartSpeed, elapsed, delta);
    this.ambientEvents.update(cartPosition, elapsed, delta);
    this.averageUpdateTime = this.averageUpdateTime === 0
      ? duration
      : this.averageUpdateTime * 0.94 + duration * 0.06;
    this.debug.activeNPCs = this.spawnManager.activeNPCs;
    this.debug.activeAnimals = this.spawnManager.activeAnimals;
    this.debug.spawnedObjects = this.spawnManager.spawnedObjects;
    this.debug.poolUsage = this.spawnManager.poolUsage;
    this.debug.currentAmbientEvent = this.ambientEvents.currentEvent;
    this.debug.averageNPCUpdateTime = this.averageUpdateTime;
  }
}
