import * as THREE from "three";
import {
  EVENT_BROKEN_BULLOCK_CART,
  EVENT_CATTLE_CROSSING,
  EVENT_MARKET_SPILL,
  EVENT_ROAD_REPAIR,
  EVENT_VILLAGE_CROWD,
  EVENT_WATER_PUDDLE,
  HAZARD_BROKEN_CART_WHEEL,
  HAZARD_FALLEN_BRANCH,
  HAZARD_HAY_BUNDLE,
  HAZARD_POTHOLE,
  HAZARD_ROCK,
  HAZARD_WOODEN_LOG,
  MAX_ROUTE_EVENTS,
  MAX_ROUTE_HAZARDS,
  MAX_ROUTE_JUNCTIONS,
} from "./procedural-world.js";

const material = (color, roughness = 0.92) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const ROCK = material(0x766d5e);
const ROCK_LIGHT = material(0x958a73);
const WOOD = material(0x67401f);
const WOOD_END = material(0x9b6b38);
const POTHOLE = material(0x765033);
const PATCH = material(0xa97343);
const PATCH_LIGHT = material(0xc08b54);
const WHEEL = material(0x4b3423);
const WHEEL_HUB = material(0x75502c);
const HAY = material(0xc9a84e);
const HAY_TIE = material(0x75502c);
const EVENT_CLOTH = material(0xc45f38);
const EVENT_SKIN = material(0x9a6545);
const EVENT_CATTLE = material(0x927052);
const EVENT_WHITE = material(0xe2d6b9);
const EVENT_WATER = new THREE.MeshStandardMaterial({
  color: 0x5c8e9c,
  roughness: 0.4,
  transparent: true,
  opacity: 0.72,
});
const ROUTE_BRANCH = material(0xb98550);
const DESTINATION_WOOD = material(0x714526);
const DESTINATION_CLOTH = material(0xd7a83d);
const DESTINATION_PLASTER = material(0xd9b271);
const DESTINATION_LEAF = material(0x3f6b38);
const VILLAGE_BLUE = material(0x74a5a1);
const VILLAGE_ROOF = material(0xa65334);
const VILLAGE_GROUND = material(0xb98b55);
const VILLAGE_DARK = material(0x3b3027);

function prepareMesh(mesh, castShadow = true) {
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function createRock() {
  const group = new THREE.Group();
  const base = prepareMesh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), ROCK));
  base.scale.set(1.15, 0.62, 0.9);
  base.position.y = 0.29;
  base.rotation.set(0.12, 0.25, -0.08);
  const chip = prepareMesh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), ROCK_LIGHT));
  chip.scale.y = 0.7;
  chip.position.set(0.38, 0.16, -0.2);
  group.add(base, chip);
  return { group, radius: 0.5, severity: 0.72, roughness: 0.8 };
}

function createPothole() {
  const group = new THREE.Group();
  const depression = prepareMesh(
    new THREE.Mesh(new THREE.CircleGeometry(0.82, 12), POTHOLE),
    false,
  );
  depression.rotation.x = -Math.PI / 2;
  depression.position.y = 0.052;
  depression.scale.set(1.15, 0.78, 1);
  group.add(depression);

  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const edge = prepareMesh(
      new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 2) * 0.025, 0), ROCK),
    );
    edge.scale.y = 0.45;
    edge.position.set(Math.cos(angle) * 0.76, 0.075, Math.sin(angle) * 0.55);
    group.add(edge);
  }
  return { group, radius: 0.78, severity: 0.88, roughness: 1 };
}

function createLog() {
  const group = new THREE.Group();
  const trunk = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 1.75, 8),
    [WOOD, WOOD_END, WOOD_END],
  ));
  trunk.rotation.z = Math.PI / 2;
  trunk.position.y = 0.25;
  group.add(trunk);
  return { group, radius: 0.72, severity: 0.82, roughness: 0.9 };
}

function createPatch() {
  const group = new THREE.Group();
  const base = prepareMesh(new THREE.Mesh(new THREE.CircleGeometry(1.15, 10), PATCH), false);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.051;
  base.scale.set(1.2, 0.72, 1);
  group.add(base);

  [-0.55, 0, 0.52].forEach((x, index) => {
    const ridge = prepareMesh(
      new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 1.2 - index * 0.12), PATCH_LIGHT),
      false,
    );
    ridge.position.set(x, 0.073, (index - 1) * 0.12);
    ridge.rotation.y = 0.08 * (index - 1);
    group.add(ridge);
  });
  return { group, radius: 1.05, severity: 0.42, roughness: 0.65 };
}

function createObstacle(type) {
  if (type === HAZARD_ROCK) return createRock();
  if (type === HAZARD_POTHOLE) return createPothole();
  if (
    type === HAZARD_WOODEN_LOG
    || type === HAZARD_FALLEN_BRANCH
  ) {
    const obstacle = createLog();
    if (type === HAZARD_FALLEN_BRANCH) {
      obstacle.group.scale.set(0.84, 0.72, 1.2);
      obstacle.radius = 0.68;
      obstacle.severity = 0.68;
      obstacle.roughness = 0.78;
    }
    return obstacle;
  }
  if (type === HAZARD_BROKEN_CART_WHEEL) {
    const group = new THREE.Group();
    const rim = prepareMesh(new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.075, 6, 14),
      WHEEL,
    ));
    rim.rotation.y = Math.PI / 2;
    rim.position.y = 0.16;
    group.add(rim);
    const hub = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.24, 8),
      WHEEL_HUB,
    ));
    hub.rotation.z = Math.PI / 2;
    hub.position.y = 0.16;
    group.add(hub);
    for (let index = 0; index < 8; index += 1) {
      const spoke = prepareMesh(new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.035, 0.92),
        WHEEL,
      ));
      spoke.rotation.x = (index / 8) * Math.PI * 2;
      spoke.rotation.y = Math.PI / 2;
      spoke.position.y = 0.16;
      group.add(spoke);
    }
    return {
      group,
      radius: 0.62,
      severity: 0.7,
      roughness: 0.72,
    };
  }
  if (type === HAZARD_HAY_BUNDLE) {
    const group = new THREE.Group();
    const bale = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.72, 0.82),
      HAY,
    ));
    bale.position.y = 0.37;
    bale.rotation.y = 0.08;
    group.add(bale);
    for (let side = -1; side <= 1; side += 2) {
      const tie = prepareMesh(new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.75, 0.86),
        HAY_TIE,
      ));
      tie.position.set(side * 0.36, 0.38, 0);
      group.add(tie);
    }
    return {
      group,
      radius: 0.7,
      severity: 0.48,
      roughness: 0.58,
    };
  }
  return createPatch();
}

const HAZARD_TYPES = [
  HAZARD_ROCK,
  HAZARD_FALLEN_BRANCH,
  HAZARD_WOODEN_LOG,
  HAZARD_POTHOLE,
  HAZARD_BROKEN_CART_WHEEL,
  HAZARD_HAY_BUNDLE,
];

const EVENT_TYPES = [
  EVENT_BROKEN_BULLOCK_CART,
  EVENT_CATTLE_CROSSING,
  EVENT_VILLAGE_CROWD,
  EVENT_ROAD_REPAIR,
  EVENT_MARKET_SPILL,
  EVENT_WATER_PUDDLE,
];

function addEventWheel(group, x, z) {
  const wheel = prepareMesh(new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.07, 6, 12),
    WHEEL,
  ));
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(x, 0.5, z);
  group.add(wheel);
}

function createBrokenCartEvent() {
  const group = new THREE.Group();
  const bed = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.42, 3.5),
    WOOD,
  ));
  bed.position.y = 0.8;
  bed.rotation.z = 0.08;
  group.add(bed);
  addEventWheel(group, -1.3, -1);
  addEventWheel(group, -1.3, 1);
  const load = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.72, 1.2),
    HAY,
  ));
  load.position.set(0.15, 1.35, 0.15);
  group.add(load);
  return group;
}

function addPlaceholderCattle(group, x, z, rotation) {
  const cattle = new THREE.Group();
  const body = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.72, 0.65),
    EVENT_CATTLE,
  ));
  body.position.y = 0.95;
  cattle.add(body);
  const head = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.48, 0.45),
    EVENT_WHITE,
  ));
  head.position.set(0.88, 1.1, 0);
  cattle.add(head);
  for (let side = -1; side <= 1; side += 2) {
    const leg = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.7, 5),
      EVENT_CATTLE,
    ));
    leg.position.set(side * 0.45, 0.4, 0);
    cattle.add(leg);
  }
  cattle.position.set(x, 0, z);
  cattle.rotation.y = rotation;
  group.add(cattle);
}

function createCattleCrossingEvent() {
  const group = new THREE.Group();
  addPlaceholderCattle(group, -2.3, -1.8, 0.08);
  addPlaceholderCattle(group, 0, 0, -0.05);
  addPlaceholderCattle(group, 2.3, 1.8, 0.1);
  return group;
}

function addPlaceholderPerson(group, x, z, colorMaterial) {
  const body = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 1.15, 6),
    colorMaterial,
  ));
  body.position.set(x, 0.65, z);
  group.add(body);
  const head = prepareMesh(new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 7, 5),
    EVENT_SKIN,
  ));
  head.position.set(x, 1.38, z);
  group.add(head);
}

function createVillageCrowdEvent() {
  const group = new THREE.Group();
  for (let index = 0; index < 6; index += 1) {
    addPlaceholderPerson(
      group,
      (index % 3 - 1) * 0.72,
      (Math.floor(index / 3) - 0.5) * 1.1,
      index % 2 === 0 ? EVENT_CLOTH : DESTINATION_CLOTH,
    );
  }
  return group;
}

function createRoadRepairEvent() {
  const group = new THREE.Group();
  for (let row = -1; row <= 1; row += 2) {
    const barrier = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.32, 0.26),
      DESTINATION_CLOTH,
    ));
    barrier.position.set(0, 0.72, row * 2.1);
    group.add(barrier);
    for (let side = -1; side <= 1; side += 2) {
      const post = prepareMesh(new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 1.25, 0.18),
        WOOD,
      ));
      post.position.set(side * 1.55, 0.62, row * 2.1);
      group.add(post);
    }
  }
  return group;
}

function createMarketSpillEvent() {
  const group = new THREE.Group();
  const hay = createObstacle(HAZARD_HAY_BUNDLE).group;
  hay.position.set(-0.8, 0, -1.2);
  hay.scale.setScalar(0.78);
  group.add(hay);
  const rock = createRock().group;
  rock.position.set(0.85, 0, 0.25);
  group.add(rock);
  const log = createLog().group;
  log.position.set(-0.15, 0, 1.55);
  log.scale.setScalar(0.72);
  group.add(log);
  return group;
}

function createWaterPuddleEvent() {
  const group = new THREE.Group();
  const puddle = prepareMesh(new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 16),
    EVENT_WATER,
  ), false);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.055;
  puddle.scale.set(1, 0.62, 1);
  group.add(puddle);
  return group;
}

function createEventVisual(type) {
  if (type === EVENT_BROKEN_BULLOCK_CART) return createBrokenCartEvent();
  if (type === EVENT_CATTLE_CROSSING) return createCattleCrossingEvent();
  if (type === EVENT_VILLAGE_CROWD) return createVillageCrowdEvent();
  if (type === EVENT_ROAD_REPAIR) return createRoadRepairEvent();
  if (type === EVENT_MARKET_SPILL) return createMarketSpillEvent();
  return createWaterPuddleEvent();
}

const ROUTE_BRANCH_SEGMENTS = 14;
const ROUTE_BRANCH_LENGTH = 52;
const ROUTE_BRANCH_OFFSET = 12;
const JUNCTION_BLEND_LENGTH = 18;
const MAX_DIRECTION_VILLAGERS = MAX_ROUTE_JUNCTIONS * 3;

function createDirectionVillager() {
  const group = new THREE.Group();
  const body = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.36, 1.05, 6),
    EVENT_CLOTH,
  ));
  body.position.y = 1.05;
  group.add(body);
  const head = prepareMesh(new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 7, 5),
    EVENT_SKIN,
  ));
  head.position.y = 1.78;
  group.add(head);
  const turban = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.26, 0.16, 8),
    DESTINATION_CLOTH,
  ));
  turban.position.y = 1.98;
  group.add(turban);
  const pointArm = new THREE.Group();
  pointArm.position.set(0.3, 1.42, 0);
  const arm = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.08, 0.72, 6),
    EVENT_SKIN,
  ));
  arm.position.y = -0.34;
  pointArm.add(arm);
  pointArm.rotation.z = -0.18;
  group.add(pointArm);
  return { group, pointArm };
}

function createDestinationMarker() {
  const marker = new THREE.Group();
  marker.name = "VillageDeliveryPoint";
  const pad = prepareMesh(new THREE.Mesh(
    new THREE.RingGeometry(1.7, 2.25, 24),
    DESTINATION_CLOTH,
  ), false);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.07;
  marker.add(pad);
  const post = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.15, 3.8, 7),
    DESTINATION_WOOD,
  ));
  post.position.set(2.15, 1.9, 0);
  marker.add(post);
  const flag = prepareMesh(new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.45, 3),
    DESTINATION_CLOTH,
  ));
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(1.52, 3.25, 0);
  marker.add(flag);
  marker.visible = false;
  return marker;
}

function seededVillageRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value ^ (value >>> 15), 2246822519) + 3266489917) >>> 0;
    value ^= value >>> 13;
    return (value >>> 0) / 4294967295;
  };
}

function createVillageHouse() {
  const group = new THREE.Group();
  const body = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 3, 4.2),
    DESTINATION_PLASTER,
  ));
  body.position.y = 1.5;
  const roof = prepareMesh(new THREE.Mesh(
    new THREE.ConeGeometry(3.55, 1.65, 4),
    VILLAGE_ROOF,
  ));
  roof.position.y = 3.82;
  roof.rotation.y = Math.PI / 4;
  const door = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.75, 0.12),
    VILLAGE_DARK,
  ));
  door.position.set(0, 0.88, 2.16);
  group.add(body, roof, door);
  return { group, body, roof };
}

function createVillagePerson(index) {
  const group = new THREE.Group();
  const body = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.12, 6),
    index % 3 === 0 ? DESTINATION_CLOTH : index % 3 === 1 ? EVENT_CLOTH : VILLAGE_BLUE,
  ));
  body.position.y = 0.65;
  const head = prepareMesh(new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 7, 5),
    EVENT_SKIN,
  ));
  head.position.y = 1.38;
  const pot = prepareMesh(new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    EVENT_CLOTH,
  ));
  pot.scale.y = 1.2;
  pot.position.y = 1.83;
  pot.visible = index % 4 === 2;
  const broom = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.045, 1.45, 5),
    HAY_TIE,
  ));
  broom.position.set(0.34, 0.55, 0);
  broom.rotation.z = -0.38;
  broom.visible = false;
  group.add(body, head, pot, broom);
  return {
    group,
    body,
    head,
    pot,
    broom,
    behavior: "standing",
    phase: index * 0.73,
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
    targetX: 0,
    targetZ: 0,
    baseRotation: 0,
    baseScale: 1,
  };
}

function createVillageAnimal(index) {
  const group = new THREE.Group();
  addPlaceholderCattle(group, 0, 0, 0);
  if (index % 3 === 2) {
    group.scale.set(1.12, 1, 1.08);
    group.traverse((child) => {
      if (child.isMesh && child.material === EVENT_CATTLE) child.material = VILLAGE_DARK;
    });
  }
  return {
    group,
    behavior: index % 3 === 0 ? "grazing" : index % 3 === 1 ? "wandering" : "standing",
    phase: index * 1.17,
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
    radius: 0,
    baseRotation: 0,
  };
}

function createVillageTree() {
  const group = new THREE.Group();
  const trunk = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.42, 3.4, 7),
    DESTINATION_WOOD,
  ));
  trunk.position.y = 1.7;
  const crown = prepareMesh(new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.45, 0),
    DESTINATION_LEAF,
  ));
  crown.position.y = 4.25;
  group.add(trunk, crown);
  return group;
}

function createVillageEntrance() {
  const group = new THREE.Group();
  for (let side = -1; side <= 1; side += 2) {
    const post = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 4.6, 7),
      DESTINATION_WOOD,
    ));
    post.position.set(side * 7.7, 2.3, 0);
    group.add(post);
  }
  const beam = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(15.8, 0.42, 0.38),
    DESTINATION_WOOD,
  ));
  beam.position.y = 4.35;
  const signMaterial = new THREE.SpriteMaterial({ color: 0xffffff });
  const sign = new THREE.Sprite(signMaterial);
  sign.position.set(0, 5.3, 0);
  sign.scale.set(10.5, 2.2, 1);
  sign.center.set(0.5, 0.5);
  group.add(beam, sign);
  return { group, sign, texture: null };
}

const AMBIENT_PROP_TYPES = Object.freeze([
  "charpai",
  "clay-pots",
  "hay-stack",
  "handpump",
  "bicycle",
  "wooden-cart",
  "grain-sacks",
  "lantern",
]);

function createAmbientProp(type) {
  const group = new THREE.Group();
  if (type === "charpai") {
    const bed = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 1.15),
      HAY,
    ));
    bed.position.y = 0.58;
    group.add(bed);
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const leg = prepareMesh(new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.58, 6),
          WOOD,
        ));
        leg.position.set(x * 1.05, 0.29, z * 0.43);
        group.add(leg);
      }
    }
  } else if (type === "clay-pots") {
    for (let index = 0; index < 3; index += 1) {
      const pot = prepareMesh(new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 8, 6),
        EVENT_CLOTH,
      ));
      pot.scale.y = 1.15;
      pot.position.set((index - 1) * 0.58, 0.38, (index % 2) * 0.18);
      group.add(pot);
    }
  } else if (type === "hay-stack") {
    const hay = prepareMesh(new THREE.Mesh(
      new THREE.ConeGeometry(1.25, 2.4, 10),
      HAY,
    ));
    hay.position.y = 1.2;
    group.add(hay);
  } else if (type === "handpump") {
    const stem = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 2.1, 7),
      VILLAGE_BLUE,
    ));
    stem.position.y = 1.05;
    const handle = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.1, 0.12),
      VILLAGE_DARK,
    ));
    handle.position.set(0.32, 2.02, 0);
    handle.rotation.z = 0.18;
    group.add(stem, handle);
  } else if (type === "bicycle") {
    for (let side = -1; side <= 1; side += 2) {
      const wheel = prepareMesh(new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.055, 6, 14),
        VILLAGE_DARK,
      ));
      wheel.position.set(side * 0.72, 0.5, 0);
      wheel.rotation.y = Math.PI / 2;
      group.add(wheel);
    }
    const frame = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.07, 0.07),
      VILLAGE_BLUE,
    ));
    frame.position.y = 0.72;
    frame.rotation.z = 0.18;
    group.add(frame);
  } else if (type === "wooden-cart") {
    const bed = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.42, 1.7),
      WOOD,
    ));
    bed.position.y = 0.9;
    group.add(bed);
    for (let side = -1; side <= 1; side += 2) {
      const wheel = prepareMesh(new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.075, 6, 14),
        WHEEL,
      ));
      wheel.position.set(side * 1.22, 0.58, 0);
      wheel.rotation.y = Math.PI / 2;
      group.add(wheel);
    }
  } else if (type === "grain-sacks") {
    for (let index = 0; index < 4; index += 1) {
      const sack = prepareMesh(new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 8, 6),
        HAY,
      ));
      sack.scale.set(1, 0.68, 0.78);
      sack.position.set((index % 2 - 0.5) * 0.82, 0.35 + Math.floor(index / 2) * 0.48, 0);
      group.add(sack);
    }
  } else {
    const post = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6),
      WOOD,
    ));
    post.position.y = 0.9;
    const light = prepareMesh(new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      DESTINATION_CLOTH,
    ));
    light.position.y = 1.72;
    group.add(post, light);
  }
  group.name = `VillageProp-${type}`;
  return { group, type };
}

function updateEntranceLabel(entrance, label) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  context.fillStyle = "#6f4528";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#e3b34c";
  context.lineWidth = 12;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = "#fff4d2";
  context.font = "700 54px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, canvas.height / 2);
  if (entrance.texture) entrance.texture.dispose();
  entrance.texture = new THREE.CanvasTexture(canvas);
  entrance.texture.colorSpace = THREE.SRGBColorSpace;
  entrance.sign.material.map = entrance.texture;
  entrance.sign.material.needsUpdate = true;
}

function createMissionVillage() {
  const group = new THREE.Group();
  group.name = "PersistentMissionVillage";
  group.visible = false;
  const entrance = createVillageEntrance();
  group.add(entrance.group);

  const square = prepareMesh(new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    VILLAGE_GROUND,
  ), false);
  square.rotation.x = -Math.PI / 2;
  group.add(square);

  const houses = Array.from({ length: 20 }, (_, index) => {
    const house = createVillageHouse();
    house.group.visible = false;
    house.body.material = index % 3 === 1 ? VILLAGE_BLUE : DESTINATION_PLASTER;
    group.add(house.group);
    return house;
  });
  const villagers = Array.from({ length: 20 }, (_, index) => {
    const villager = createVillagePerson(index);
    villager.group.visible = false;
    group.add(villager.group);
    return villager;
  });
  const animals = Array.from({ length: 8 }, (_, index) => {
    const animal = createVillageAnimal(index);
    animal.group.visible = false;
    group.add(animal.group);
    return animal;
  });
  const trees = Array.from({ length: 14 }, () => {
    const tree = createVillageTree();
    tree.visible = false;
    group.add(tree);
    return tree;
  });
  const fences = Array.from({ length: 14 }, () => {
    const fence = prepareMesh(new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.65, 0.18),
      DESTINATION_WOOD,
    ));
    fence.visible = false;
    group.add(fence);
    return fence;
  });
  const props = Array.from({ length: 24 }, (_, index) => {
    const prop = createAmbientProp(
      AMBIENT_PROP_TYPES[index % AMBIENT_PROP_TYPES.length],
    );
    prop.group.visible = false;
    group.add(prop.group);
    return prop;
  });

  const well = new THREE.Group();
  const wellBase = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.5, 1.05, 14),
    ROCK_LIGHT,
  ));
  wellBase.position.y = 0.52;
  const wellRim = prepareMesh(new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.16, 7, 18),
    ROCK,
  ));
  wellRim.rotation.x = Math.PI / 2;
  wellRim.position.y = 1.05;
  well.add(wellBase, wellRim);
  group.add(well);

  const landmark = new THREE.Group();
  const temple = new THREE.Group();
  const templeBase = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 3.8, 4.8),
    DESTINATION_PLASTER,
  ));
  templeBase.position.y = 1.9;
  const templeTower = prepareMesh(new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 6.4, 8),
    DESTINATION_CLOTH,
  ));
  templeTower.position.y = 7;
  temple.add(templeBase, templeTower);
  const banyan = createVillageTree();
  banyan.scale.set(2.1, 1.8, 2.1);
  landmark.add(temple, banyan);
  group.add(landmark);

  const deliveryBuilding = createVillageHouse();
  deliveryBuilding.group.scale.set(1.25, 1.08, 1.3);
  group.add(deliveryBuilding.group);
  return {
    group,
    entrance,
    square,
    houses,
    villagers,
    animals,
    trees,
    fences,
    props,
    well,
    landmark,
    temple,
    banyan,
    deliveryBuilding,
    descriptor: null,
    activeVillagerCount: 0,
    activeAnimalCount: 0,
    centreX: 0,
    centreZ: 0,
  };
}

function createCheckpointMarker(index) {
  const marker = new THREE.Group();
  marker.name = `RouteCheckpoint${index + 1}`;
  for (let side = -1; side <= 1; side += 2) {
    const post = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 4.2, 7),
      DESTINATION_WOOD,
    ));
    post.position.set(side * 8.2, 2.1, 0);
    marker.add(post);
  }
  const beam = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(16.6, 0.2, 0.24),
    DESTINATION_WOOD,
  ));
  beam.position.y = 4.05;
  marker.add(beam);
  for (let flagIndex = -2; flagIndex <= 2; flagIndex += 1) {
    const flag = prepareMesh(new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.58, 3),
      DESTINATION_CLOTH,
    ));
    flag.rotation.z = Math.PI;
    flag.position.set(flagIndex * 2.4, 3.72, 0);
    marker.add(flag);
  }
  marker.visible = false;
  return marker;
}

export function createRoadGameplay(scene) {
  const group = new THREE.Group();
  group.name = "RoadGameplay";
  const hazardGroup = new THREE.Group();
  hazardGroup.name = "ProceduralRouteHazards";
  const eventGroup = new THREE.Group();
  eventGroup.name = "ProceduralRouteEvents";
  const routeNetworkGroup = new THREE.Group();
  routeNetworkGroup.name = "MissionRouteNetwork";
  const directionVillagerGroup = new THREE.Group();
  directionVillagerGroup.name = "DirectionVillagers";
  const missionGroup = new THREE.Group();
  missionGroup.name = "MissionRouteMarkers";
  const missionVillage = createMissionVillage();
  const villageDebug = {
    activeVillageName: "None",
    activeVillagerCount: 0,
    activeAnimalCount: 0,
  };
  const destinationMarker = createDestinationMarker();
  const checkpointMarkers = [
    createCheckpointMarker(0),
    createCheckpointMarker(1),
    createCheckpointMarker(2),
    createCheckpointMarker(3),
  ];
  missionGroup.add(destinationMarker);
  for (let index = 0; index < checkpointMarkers.length; index += 1) {
    missionGroup.add(checkpointMarkers[index]);
  }
  group.add(
    missionVillage.group,
    missionGroup,
    hazardGroup,
    eventGroup,
    routeNetworkGroup,
    directionVillagerGroup,
  );

  const obstacles = new Array(MAX_ROUTE_HAZARDS);
  for (let index = 0; index < MAX_ROUTE_HAZARDS; index += 1) {
    const obstacleRoot = new THREE.Group();
    obstacleRoot.name = `RouteHazard${index + 1}`;
    obstacleRoot.visible = false;
    const variants = new Array(HAZARD_TYPES.length);
    for (
      let typeIndex = 0;
      typeIndex < HAZARD_TYPES.length;
      typeIndex += 1
    ) {
      const created = createObstacle(HAZARD_TYPES[typeIndex]);
      created.group.visible = false;
      obstacleRoot.add(created.group);
      variants[typeIndex] = created;
    }
    hazardGroup.add(obstacleRoot);
    obstacles[index] = {
      id: 0,
      routeDistance: 0,
      laneOffset: 0,
      lane: "centre",
      type: HAZARD_ROCK,
      size: 1,
      difficulty: 1,
      chunkIndex: 0,
      theme: "None",
      active: false,
      x: 10000,
      z: 10000,
      radius: 0,
      severity: 0,
      roughness: 0,
      hit: false,
      group: obstacleRoot,
      variants,
    };
  }
  const hazardRouteSample = {};

  const events = new Array(MAX_ROUTE_EVENTS);
  for (let index = 0; index < MAX_ROUTE_EVENTS; index += 1) {
    const eventRoot = new THREE.Group();
    eventRoot.name = `RouteEvent${index + 1}`;
    eventRoot.visible = false;
    const variants = new Array(EVENT_TYPES.length);
    for (
      let typeIndex = 0;
      typeIndex < EVENT_TYPES.length;
      typeIndex += 1
    ) {
      const visual = createEventVisual(EVENT_TYPES[typeIndex]);
      visual.visible = false;
      eventRoot.add(visual);
      variants[typeIndex] = visual;
    }
    const collisionParts = new Array(4);
    for (let partIndex = 0; partIndex < collisionParts.length; partIndex += 1) {
      collisionParts[partIndex] = {
        active: false,
        x: 10000,
        z: 10000,
        radius: 0,
      };
    }
    eventGroup.add(eventRoot);
    events[index] = {
      id: 0,
      type: EVENT_BROKEN_BULLOCK_CART,
      routeDistance: 0,
      laneOffset: 0,
      length: 0,
      difficulty: 1,
      chunkIndex: 0,
      theme: "None",
      active: false,
      hit: false,
      severity: 0,
      group: eventRoot,
      variants,
      collisionParts,
    };
  }
  const eventRouteSample = {};

  const junctionVisuals = new Array(MAX_ROUTE_JUNCTIONS);
  const branchGeometry = new THREE.PlaneGeometry(1, 1);
  branchGeometry.rotateX(-Math.PI / 2);
  const junctionGeometry = new THREE.CircleGeometry(1, 32);
  junctionGeometry.rotateX(-Math.PI / 2);
  for (let index = 0; index < MAX_ROUTE_JUNCTIONS; index += 1) {
    const junctionGroup = new THREE.Group();
    junctionGroup.name = `MissionJunction${index + 1}`;
    const left = new Array(ROUTE_BRANCH_SEGMENTS);
    const right = new Array(ROUTE_BRANCH_SEGMENTS);
    const blend = prepareMesh(
      new THREE.Mesh(junctionGeometry, ROUTE_BRANCH),
      false,
    );
    blend.visible = false;
    junctionGroup.add(blend);
    for (let segment = 0; segment < ROUTE_BRANCH_SEGMENTS; segment += 1) {
      const leftRoad = prepareMesh(
        new THREE.Mesh(branchGeometry, ROUTE_BRANCH),
        false,
      );
      const rightRoad = prepareMesh(
        new THREE.Mesh(branchGeometry, ROUTE_BRANCH),
        false,
      );
      leftRoad.visible = false;
      rightRoad.visible = false;
      junctionGroup.add(leftRoad, rightRoad);
      left[segment] = leftRoad;
      right[segment] = rightRoad;
    }
    junctionGroup.visible = false;
    routeNetworkGroup.add(junctionGroup);
    junctionVisuals[index] = { group: junctionGroup, blend, left, right };
  }

  const directionVillagers = new Array(MAX_DIRECTION_VILLAGERS);
  for (let index = 0; index < directionVillagers.length; index += 1) {
    const created = createDirectionVillager();
    created.group.name = `DirectionVillager${index + 1}`;
    created.group.visible = false;
    directionVillagerGroup.add(created.group);
    directionVillagers[index] = {
      id: `direction-villager-${index}`,
      junctionId: "None",
      routeId: "None",
      routeDistance: 0,
      isWrongRouteHelper: false,
      active: false,
      x: 10000,
      z: 10000,
      group: created.group,
      pointArm: created.pointArm,
    };
  }
  const junctionSampleA = {};
  const junctionSampleB = {};
  scene.add(group);

  function configureHazards(count, routeSampler, difficulty) {
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      const active = index < count && obstacle.active;
      obstacle.group.visible = active;
      obstacle.hit = false;
      if (!active) {
        obstacle.x = 10000;
        obstacle.z = 10000;
        obstacle.radius = 0;
        for (
          let variantIndex = 0;
          variantIndex < obstacle.variants.length;
          variantIndex += 1
        ) {
          obstacle.variants[variantIndex].group.visible = false;
        }
        continue;
      }
      obstacle.group.name = `RouteHazard-${obstacle.regionType || "Unassigned"}-${
        obstacle.regionVariant || obstacle.type
      }`;

      routeSampler(
        obstacle.routeDistance,
        difficulty,
        hazardRouteSample,
      );
      obstacle.x = (
        hazardRouteSample.centerX
        + hazardRouteSample.normalX * obstacle.laneOffset
      );
      obstacle.z = (
        hazardRouteSample.centerZ
        + hazardRouteSample.normalZ * obstacle.laneOffset
      );
      obstacle.group.position.set(
        obstacle.x,
        hazardRouteSample.centerY + 0.01,
        obstacle.z,
      );
      obstacle.group.rotation.set(
        0,
        Math.atan2(
          hazardRouteSample.tangentX,
          hazardRouteSample.tangentZ,
        ) + ((obstacle.id % 101) / 100 - 0.5) * 0.34,
        0,
      );
      obstacle.group.scale.setScalar(obstacle.size);

      let selectedVariant = obstacle.variants[0];
      for (
        let variantIndex = 0;
        variantIndex < HAZARD_TYPES.length;
        variantIndex += 1
      ) {
        const selected = HAZARD_TYPES[variantIndex] === obstacle.type;
        obstacle.variants[variantIndex].group.visible = selected;
        if (selected) selectedVariant = obstacle.variants[variantIndex];
      }
      obstacle.radius = selectedVariant.radius * obstacle.size;
      obstacle.severity = selectedVariant.severity;
      obstacle.roughness = selectedVariant.roughness;
    }
  }

  function resetHazards() {
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      obstacle.active = false;
      obstacle.hit = false;
      obstacle.x = 10000;
      obstacle.z = 10000;
      obstacle.radius = 0;
      obstacle.group.visible = false;
    }
  }

  function configureEvents(count, routeSampler, difficulty) {
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const active = index < count && event.active;
      event.group.visible = active;
      event.hit = false;
      for (
        let partIndex = 0;
        partIndex < event.collisionParts.length;
        partIndex += 1
      ) {
        const part = event.collisionParts[partIndex];
        part.active = false;
        part.x = 10000;
        part.z = 10000;
        part.radius = 0;
      }
      for (
        let variantIndex = 0;
        variantIndex < event.variants.length;
        variantIndex += 1
      ) {
        event.variants[variantIndex].visible = (
          active && EVENT_TYPES[variantIndex] === event.type
        );
      }
      if (!active) continue;
      event.group.name = `RouteEvent-${event.regionType || "Unassigned"}-${
        event.activity || event.type
      }`;

      routeSampler(event.routeDistance, difficulty, eventRouteSample);
      const baseX = (
        eventRouteSample.centerX
        + eventRouteSample.normalX * event.laneOffset
      );
      const baseZ = (
        eventRouteSample.centerZ
        + eventRouteSample.normalZ * event.laneOffset
      );
      event.group.position.set(
        baseX,
        eventRouteSample.centerY + 0.01,
        baseZ,
      );
      event.group.rotation.set(
        0,
        Math.atan2(
          eventRouteSample.tangentX,
          eventRouteSample.tangentZ,
        ),
        0,
      );

      let partCount = 1;
      let severity = 0.76;
      if (event.type === EVENT_CATTLE_CROSSING) {
        partCount = 3;
        severity = 0.66;
      } else if (event.type === EVENT_VILLAGE_CROWD) {
        partCount = 2;
        severity = 0.48;
      } else if (event.type === EVENT_ROAD_REPAIR) {
        partCount = 2;
        severity = 0.72;
      } else if (event.type === EVENT_MARKET_SPILL) {
        partCount = 3;
        severity = 0.6;
      } else if (event.type === EVENT_WATER_PUDDLE) {
        partCount = 0;
        severity = 0;
      }
      event.severity = severity;

      for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
        let localX = 0;
        let localZ = 0;
        let radius = 1.05;
        if (event.type === EVENT_CATTLE_CROSSING) {
          localX = (partIndex - 1) * 2.3;
          localZ = (partIndex - 1) * 1.8;
          radius = 0.82;
        } else if (event.type === EVENT_VILLAGE_CROWD) {
          localX = (partIndex - 0.5) * 1.05;
          localZ = (partIndex - 0.5) * 1.1;
          radius = 0.72;
        } else if (event.type === EVENT_ROAD_REPAIR) {
          localZ = (partIndex === 0 ? -1 : 1) * 2.1;
          radius = 1.65;
        } else if (event.type === EVENT_MARKET_SPILL) {
          localX = partIndex === 0 ? -0.8 : partIndex === 1 ? 0.85 : -0.15;
          localZ = partIndex === 0 ? -1.2 : partIndex === 1 ? 0.25 : 1.55;
          radius = partIndex === 1 ? 0.5 : 0.66;
        } else if (event.type === EVENT_BROKEN_BULLOCK_CART) {
          radius = 1.35;
        }
        const part = event.collisionParts[partIndex];
        const lateralOffset = event.laneOffset + localX;
        part.active = true;
        part.x = (
          eventRouteSample.centerX
          + eventRouteSample.normalX * lateralOffset
          + eventRouteSample.tangentX * localZ
        );
        part.z = (
          eventRouteSample.centerZ
          + eventRouteSample.normalZ * lateralOffset
          + eventRouteSample.tangentZ * localZ
        );
        part.radius = radius;
      }
    }
  }

  function resetEvents() {
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      event.active = false;
      event.hit = false;
      event.group.visible = false;
      for (
        let partIndex = 0;
        partIndex < event.collisionParts.length;
        partIndex += 1
      ) {
        event.collisionParts[partIndex].active = false;
      }
    }
  }

  function branchOffsetAt(routeDistance, junctionDistance, direction) {
    const progress = THREE.MathUtils.clamp(
      (routeDistance - (junctionDistance - 6)) / ROUTE_BRANCH_LENGTH,
      0,
      1,
    );
    const smoothProgress = progress * progress * (3 - 2 * progress);
    const side = direction === "LEFT" ? 1 : -1;
    return Math.sin(smoothProgress * Math.PI) * ROUTE_BRANCH_OFFSET * side;
  }

  function configureBranch(
    meshes,
    descriptor,
    direction,
    routeSampler,
    difficulty,
    visible,
  ) {
    for (let segment = 0; segment < meshes.length; segment += 1) {
      const mesh = meshes[segment];
      mesh.visible = visible;
      if (!visible) continue;
      const startDistance = (
        descriptor.routeDistance - 6
        + (segment / ROUTE_BRANCH_SEGMENTS) * ROUTE_BRANCH_LENGTH
      );
      const endDistance = (
        descriptor.routeDistance - 6
        + ((segment + 1) / ROUTE_BRANCH_SEGMENTS) * ROUTE_BRANCH_LENGTH
      );
      routeSampler(startDistance, difficulty, junctionSampleA);
      routeSampler(endDistance, difficulty, junctionSampleB);
      const startOffset = branchOffsetAt(
        startDistance,
        descriptor.routeDistance,
        direction,
      );
      const endOffset = branchOffsetAt(
        endDistance,
        descriptor.routeDistance,
        direction,
      );
      const startX = (
        junctionSampleA.centerX + junctionSampleA.normalX * startOffset
      );
      const startZ = (
        junctionSampleA.centerZ + junctionSampleA.normalZ * startOffset
      );
      const endX = (
        junctionSampleB.centerX + junctionSampleB.normalX * endOffset
      );
      const endZ = (
        junctionSampleB.centerZ + junctionSampleB.normalZ * endOffset
      );
      const deltaX = endX - startX;
      const deltaZ = endZ - startZ;
      const branchProgress = (segment + 0.5) / meshes.length;
      const separation = Math.sin(branchProgress * Math.PI);
      const roadWidth = (
        junctionSampleA.width + junctionSampleB.width
      ) * 0.5;
      const branchWidth = THREE.MathUtils.lerp(
        roadWidth * 0.64,
        Math.max(5.8, roadWidth * 0.42),
        separation,
      );
      mesh.position.set(
        (startX + endX) * 0.5,
        (junctionSampleA.centerY + junctionSampleB.centerY) * 0.5 + 0.069,
        (startZ + endZ) * 0.5,
      );
      mesh.rotation.set(0, Math.atan2(deltaX, deltaZ), 0);
      mesh.scale.set(
        branchWidth,
        1,
        Math.hypot(deltaX, deltaZ) + 0.72,
      );
    }
  }

  function placeDirectionVillager(
    villager,
    descriptor,
    routeId,
    direction,
    routeDistance,
    isWrongRouteHelper,
    routeSampler,
    difficulty,
  ) {
    routeSampler(routeDistance, difficulty, junctionSampleA);
    const branchOffset = direction === "STRAIGHT"
      ? 0
      : branchOffsetAt(routeDistance, descriptor.routeDistance, direction);
    const side = direction === "LEFT" ? 1 : -1;
    const roadsideOffset = isWrongRouteHelper
      ? branchOffset + side * 3.3
      : -(junctionSampleA.width * 0.5 + 2.5);
    villager.junctionId = descriptor.id;
    villager.routeId = routeId;
    villager.routeDistance = routeDistance;
    villager.isWrongRouteHelper = isWrongRouteHelper;
    villager.active = true;
    villager.x = junctionSampleA.centerX
      + junctionSampleA.normalX * roadsideOffset;
    villager.z = junctionSampleA.centerZ
      + junctionSampleA.normalZ * roadsideOffset;
    villager.group.position.set(
      villager.x,
      junctionSampleA.centerY + 0.01,
      villager.z,
    );
    villager.group.rotation.set(
      0,
      Math.atan2(junctionSampleA.tangentX, junctionSampleA.tangentZ)
        + (side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5),
      0,
    );
    villager.group.visible = true;
    villager.pointArm.rotation.set(0, 0, -0.18);
  }

  function configureRouteNetwork(
    junctions,
    count,
    routeSampler,
    difficulty,
  ) {
    let villagerIndex = 0;
    for (let index = 0; index < junctionVisuals.length; index += 1) {
      const descriptor = junctions[index];
      const visual = junctionVisuals[index];
      const active = index < count && descriptor.active;
      visual.group.visible = active;
      visual.blend.visible = active;
      let hasLeft = false;
      let hasRight = false;
      if (active) {
        for (
          let routeIndex = 0;
          routeIndex < descriptor.outgoingRoutes.length;
          routeIndex += 1
        ) {
          const route = descriptor.outgoingRoutes[routeIndex];
          if (route.direction === "LEFT") hasLeft = true;
          else if (route.direction === "RIGHT") hasRight = true;
        }
      }
      if (active) {
        routeSampler(
          descriptor.routeDistance + JUNCTION_BLEND_LENGTH * 0.2,
          difficulty,
          junctionSampleA,
        );
        visual.blend.position.set(
          junctionSampleA.centerX,
          junctionSampleA.centerY + 0.068,
          junctionSampleA.centerZ,
        );
        visual.blend.rotation.set(
          0,
          Math.atan2(junctionSampleA.tangentX, junctionSampleA.tangentZ),
          0,
        );
        visual.blend.scale.set(
          junctionSampleA.width * 0.57,
          1,
          JUNCTION_BLEND_LENGTH * 0.44,
        );
      }
      configureBranch(
        visual.left,
        descriptor,
        "LEFT",
        routeSampler,
        difficulty,
        active && hasLeft,
      );
      configureBranch(
        visual.right,
        descriptor,
        "RIGHT",
        routeSampler,
        difficulty,
        active && hasRight,
      );
      if (!active) continue;

      placeDirectionVillager(
        directionVillagers[villagerIndex],
        descriptor,
        descriptor.incomingRouteId,
        "STRAIGHT",
        descriptor.villagerSpawnRouteDistance,
        false,
        routeSampler,
        difficulty,
      );
      villagerIndex += 1;

      for (
        let routeIndex = 0;
        routeIndex < descriptor.outgoingRoutes.length;
        routeIndex += 1
      ) {
        const route = descriptor.outgoingRoutes[routeIndex];
        if (route.id === descriptor.correctOutgoingRouteId) continue;
        placeDirectionVillager(
          directionVillagers[villagerIndex],
          descriptor,
          route.id,
          route.direction,
          descriptor.wrongVillagerSpawnRouteDistance,
          true,
          routeSampler,
          difficulty,
        );
        villagerIndex += 1;
      }
    }
    for (
      let index = villagerIndex;
      index < directionVillagers.length;
      index += 1
    ) {
      const villager = directionVillagers[index];
      villager.active = false;
      villager.group.visible = false;
      villager.x = 10000;
      villager.z = 10000;
    }
  }

  function setVillagerGuidance(villagerId, direction, active) {
    for (let index = 0; index < directionVillagers.length; index += 1) {
      const villager = directionVillagers[index];
      const selected = active && villager.id === villagerId;
      villager.pointArm.rotation.z = selected
        ? direction === "LEFT" ? 1.2 : direction === "RIGHT" ? -1.2 : -1.55
        : -0.18;
    }
  }

  function resetRouteNetwork() {
    for (let index = 0; index < junctionVisuals.length; index += 1) {
      junctionVisuals[index].group.visible = false;
    }
    for (let index = 0; index < directionVillagers.length; index += 1) {
      directionVillagers[index].active = false;
      directionVillagers[index].group.visible = false;
    }
  }

  function placeMarker(marker, sample, yOffset, widthScale = 1) {
    marker.position.set(
      sample.centerX,
      sample.centerY + yOffset,
      sample.centerZ,
    );
    marker.rotation.set(
      0,
      Math.atan2(sample.tangentX, sample.tangentZ),
      0,
    );
    marker.scale.set(widthScale, 1, 1);
    marker.visible = true;
  }

  function placeDestination(sample, villageName = "Village", lateralOffset = 0) {
    placeMarker(destinationMarker, sample, 0.012);
    destinationMarker.position.x += sample.normalX * lateralOffset;
    destinationMarker.position.z += sample.normalZ * lateralOffset;
    destinationMarker.name = `Destination-${villageName}`;
  }

  function placeVillageObject(
    object,
    routeDistance,
    lateralOffset,
    routeSampler,
    difficulty,
    rotationOffset = 0,
    yOffset = 0,
  ) {
    routeSampler(routeDistance, difficulty, junctionSampleA);
    object.position.set(
      junctionSampleA.centerX + junctionSampleA.normalX * lateralOffset,
      junctionSampleA.centerY + yOffset,
      junctionSampleA.centerZ + junctionSampleA.normalZ * lateralOffset,
    );
    object.rotation.y = (
      Math.atan2(junctionSampleA.tangentX, junctionSampleA.tangentZ)
      + rotationOffset
    );
    object.visible = true;
  }

  function configureVillage(descriptor, routeSampler, difficulty) {
    const random = seededVillageRandom(descriptor.seed);
    const regionType = descriptor.region ? descriptor.region.type : "Farming";
    const startDistance = descriptor.entrance.routeDistance;
    const villageSpan = descriptor.routeDistance - startDistance + 24;
    const zones = descriptor.activityZones;
    const zoneByType = (type) => {
      for (let index = 0; index < zones.length; index += 1) {
        if (zones[index].type === type) return zones[index];
      }
      return zones[0];
    };
    missionVillage.descriptor = descriptor;
    missionVillage.group.visible = true;
    updateEntranceLabel(missionVillage.entrance, descriptor.entrance.label);
    placeVillageObject(
      missionVillage.entrance.group,
      startDistance,
      0,
      routeSampler,
      difficulty,
    );

    routeSampler(descriptor.square.routeDistance, difficulty, junctionSampleA);
    missionVillage.square.position.set(
      junctionSampleA.centerX,
      junctionSampleA.centerY + 0.035,
      junctionSampleA.centerZ,
    );
    missionVillage.square.scale.setScalar(descriptor.square.radius);
    missionVillage.square.visible = true;
    missionVillage.centreX = junctionSampleA.centerX;
    missionVillage.centreZ = junctionSampleA.centerZ;

    const ranks = Math.ceil(descriptor.size / 2);
    for (let index = 0; index < missionVillage.houses.length; index += 1) {
      const house = missionVillage.houses[index];
      if (index >= descriptor.size) {
        house.group.visible = false;
        continue;
      }
      const side = index % 2 ? 1 : -1;
      const rank = Math.floor(index / 2);
      const progress = ranks <= 1 ? 0.5 : rank / (ranks - 1);
      const routeDistance = startDistance + 10 + progress * (villageSpan - 18);
      const lateral = side * (14.5 + random() * 5.5);
      const scale = 0.82 + random() * 0.25;
      house.body.material = regionType === "Riverside"
        ? VILLAGE_BLUE
        : regionType === "Dry Plains"
          ? DESTINATION_PLASTER
          : index % 3 === 1 ? VILLAGE_BLUE : DESTINATION_PLASTER;
      house.roof.material = regionType === "Forest"
        ? HAY
        : VILLAGE_ROOF;
      house.group.scale.setScalar(scale);
      placeVillageObject(
        house.group,
        routeDistance,
        lateral,
        routeSampler,
        difficulty,
        side > 0 ? -Math.PI / 2 : Math.PI / 2,
      );
    }

    const residentCount = Math.min(
      missionVillage.villagers.length,
      descriptor.population,
    );
    for (let index = 0; index < missionVillage.villagers.length; index += 1) {
      const villager = missionVillage.villagers[index];
      if (index >= residentCount) {
        villager.group.visible = false;
        continue;
      }
      const behaviorSequence = [
        "chatting",
        "chatting",
        "sweeping",
        "carrying-water",
        "feeding-cows",
        "sitting",
        "resting",
        "walking",
      ];
      const behavior = behaviorSequence[index % behaviorSequence.length];
      let zone = zoneByType("village-square");
      if (behavior === "sweeping") zone = zoneByType("houses");
      else if (behavior === "carrying-water") zone = zoneByType("well");
      else if (behavior === "feeding-cows") zone = zoneByType("animal-shed");
      else if (behavior === "sitting") zone = zoneByType("tea-stall");
      else if (behavior === "resting") {
        zone = zoneByType(
          descriptor.landmark === "Temple" ? "temple-area" : "banyan-tree",
        );
      }
      const side = Math.sign(zone.lateralOffset) || (index % 2 ? 1 : -1);
      const child = index < descriptor.populationBreakdown.children;
      villager.baseScale = child ? 0.72 : 0.92 + random() * 0.12;
      villager.group.scale.setScalar(villager.baseScale);
      villager.behavior = behavior;
      villager.pot.visible = behavior === "carrying-water";
      villager.broom.visible = behavior === "sweeping";
      placeVillageObject(
        villager.group,
        zone.routeDistance + (random() - 0.5) * zone.radius,
        zone.lateralOffset + side * (1.2 + random() * Math.max(1.2, zone.radius * 0.35)),
        routeSampler,
        difficulty,
        side > 0 ? -Math.PI / 2 : Math.PI / 2,
      );
      villager.anchorX = villager.group.position.x;
      villager.anchorY = villager.group.position.y;
      villager.anchorZ = villager.group.position.z;
      villager.targetX = villager.anchorX + junctionSampleA.tangentX * (2 + random() * 2.5);
      villager.targetZ = villager.anchorZ + junctionSampleA.tangentZ * (2 + random() * 2.5);
      villager.baseRotation = villager.group.rotation.y;
      villager.phase = random() * Math.PI * 2;
    }

    const animalCount = Math.min(
      missionVillage.animals.length,
      descriptor.populationBreakdown.cattle
        + descriptor.populationBreakdown.buffaloes,
    );
    for (let index = 0; index < missionVillage.animals.length; index += 1) {
      const animal = missionVillage.animals[index];
      if (index >= animalCount) {
        animal.group.visible = false;
        continue;
      }
      const animalZone = zoneByType("animal-shed");
      const side = Math.sign(animalZone.lateralOffset) || (index % 2 ? 1 : -1);
      placeVillageObject(
        animal.group,
        animalZone.routeDistance + (random() - 0.5) * animalZone.radius,
        animalZone.lateralOffset + side * (1 + random() * 3.5),
        routeSampler,
        difficulty,
        random() * Math.PI * 2,
      );
      animal.anchorX = animal.group.position.x;
      animal.anchorY = animal.group.position.y;
      animal.anchorZ = animal.group.position.z;
      animal.radius = 0.7 + random() * 1.6;
      animal.baseRotation = animal.group.rotation.y;
    }

    const treeCount = Math.min(
      missionVillage.trees.length,
      descriptor.decorationCounts.trees,
    );
    for (let index = 0; index < missionVillage.trees.length; index += 1) {
      const tree = missionVillage.trees[index];
      if (index >= treeCount) {
        tree.visible = false;
        continue;
      }
      const side = index % 2 ? 1 : -1;
      const scale = 0.75 + random() * 0.55;
      tree.scale.setScalar(scale);
      placeVillageObject(
        tree,
        startDistance + 4 + random() * villageSpan,
        side * (21 + random() * 8),
        routeSampler,
        difficulty,
        random() * Math.PI * 2,
      );
    }

    const fenceCount = Math.min(
      missionVillage.fences.length,
      descriptor.decorationCounts.fences,
    );
    for (let index = 0; index < missionVillage.fences.length; index += 1) {
      const fence = missionVillage.fences[index];
      if (index >= fenceCount) {
        fence.visible = false;
        continue;
      }
      const side = index % 2 ? 1 : -1;
      placeVillageObject(
        fence,
        startDistance + 7 + (index / Math.max(1, fenceCount - 1)) * (villageSpan - 10),
        side * 11.8,
        routeSampler,
        difficulty,
      );
      fence.position.y += 0.36;
    }

    const propZoneTypes = [
      "tea-stall",
      "well",
      "animal-shed",
      "delivery-market",
      "grain-market",
      "houses",
      "village-square",
    ];
    for (let index = 0; index < missionVillage.props.length; index += 1) {
      const prop = missionVillage.props[index];
      prop.group.scale.set(1, 1, 1);
      if (regionType === "Riverside" && prop.type === "wooden-cart") {
        prop.group.scale.set(1.45, 0.62, 0.72);
      } else if (
        regionType === "Riverside"
        && prop.type === "clay-pots"
      ) {
        prop.group.scale.setScalar(1.2);
      } else if (
        regionType === "Farming"
        && (prop.type === "grain-sacks" || prop.type === "hay-stack")
      ) {
        prop.group.scale.setScalar(1.25);
      } else if (
        regionType === "Forest"
        && prop.type === "wooden-cart"
      ) {
        prop.group.scale.set(1.15, 1, 1.25);
      }
      let propZone = zoneByType(propZoneTypes[index % propZoneTypes.length]);
      if (propZone === zones[0] && propZoneTypes[index % propZoneTypes.length] === "delivery-market") {
        propZone = zoneByType("grain-market");
      }
      const side = Math.sign(propZone.lateralOffset) || (index % 2 ? 1 : -1);
      placeVillageObject(
        prop.group,
        propZone.routeDistance + (random() - 0.5) * propZone.radius,
        propZone.lateralOffset + side * (1.4 + random() * Math.max(1.4, propZone.radius * 0.45)),
        routeSampler,
        difficulty,
        random() * Math.PI,
      );
    }

    const wellZone = zoneByType("well");
    placeVillageObject(
      missionVillage.well,
      wellZone.routeDistance,
      wellZone.lateralOffset,
      routeSampler,
      difficulty,
    );
    const landmarkZone = zoneByType(
      descriptor.landmark === "Temple" ? "temple-area" : "banyan-tree",
    );
    placeVillageObject(
      missionVillage.landmark,
      landmarkZone.routeDistance,
      landmarkZone.lateralOffset,
      routeSampler,
      difficulty,
    );
    missionVillage.temple.visible = descriptor.landmark === "Temple";
    missionVillage.banyan.visible = descriptor.landmark === "Banyan Tree";

    const deliverySide = Math.sign(descriptor.deliveryPoint.lateralOffset) || 1;
    missionVillage.deliveryBuilding.body.material = regionType === "Riverside"
      ? VILLAGE_BLUE
      : DESTINATION_PLASTER;
    missionVillage.deliveryBuilding.roof.material = regionType === "Forest"
      ? HAY
      : VILLAGE_ROOF;
    placeVillageObject(
      missionVillage.deliveryBuilding.group,
      descriptor.deliveryPoint.routeDistance + 2,
      deliverySide * 11.5,
      routeSampler,
      difficulty,
      deliverySide > 0 ? -Math.PI / 2 : Math.PI / 2,
    );
    missionVillage.activeVillagerCount = residentCount;
    missionVillage.activeAnimalCount = animalCount;
  }

  function resetVillage() {
    missionVillage.group.visible = false;
    missionVillage.descriptor = null;
    missionVillage.activeVillagerCount = 0;
    missionVillage.activeAnimalCount = 0;
    villageDebug.activeVillageName = "None";
    villageDebug.activeVillagerCount = 0;
    villageDebug.activeAnimalCount = 0;
  }

  function updateVillage(playerPosition, elapsed) {
    if (!missionVillage.group.visible || !missionVillage.descriptor) {
      villageDebug.activeVillageName = "None";
      villageDebug.activeVillagerCount = 0;
      villageDebug.activeAnimalCount = 0;
      return;
    }
    const dx = playerPosition.x - missionVillage.centreX;
    const dz = playerPosition.z - missionVillage.centreZ;
    const nearby = dx * dx + dz * dz <= 170 * 170;
    villageDebug.activeVillageName = nearby
      ? missionVillage.descriptor.name
      : "None";
    villageDebug.activeVillagerCount = nearby
      ? missionVillage.activeVillagerCount
      : 0;
    villageDebug.activeAnimalCount = nearby
      ? missionVillage.activeAnimalCount
      : 0;
    if (!nearby) return;

    for (let index = 0; index < missionVillage.activeVillagerCount; index += 1) {
      const villager = missionVillage.villagers[index];
      const root = villager.group;
      const cycle = Math.sin(elapsed * 0.7 + villager.phase);
      root.position.y = villager.anchorY;
      root.rotation.x = 0;
      root.rotation.z = 0;
      root.rotation.y = villager.baseRotation;
      if (villager.behavior === "walking" || villager.behavior === "carrying-water") {
        const progress = cycle * 0.5 + 0.5;
        root.position.x = villager.anchorX
          + (villager.targetX - villager.anchorX) * progress;
        root.position.z = villager.anchorZ
          + (villager.targetZ - villager.anchorZ) * progress;
        root.position.y += Math.abs(Math.sin(elapsed * 3.6 + villager.phase)) * 0.035;
      } else {
        root.position.x = villager.anchorX;
        root.position.z = villager.anchorZ;
      }
      if (villager.behavior === "chatting") {
        root.rotation.y += cycle * 0.16;
        villager.body.rotation.z = Math.sin(elapsed * 1.8 + villager.phase) * 0.035;
      } else if (villager.behavior === "sweeping") {
        root.rotation.z = Math.sin(elapsed * 2.7 + villager.phase) * 0.08;
        villager.broom.rotation.z = -0.38 + Math.sin(elapsed * 3.4 + villager.phase) * 0.34;
      } else if (villager.behavior === "feeding-cows") {
        root.rotation.x = 0.18 + cycle * 0.04;
      } else if (villager.behavior === "sitting") {
        root.position.y = villager.anchorY - 0.38;
      } else if (villager.behavior === "resting") {
        root.rotation.z = -0.08 + cycle * 0.018;
      }
    }

    for (let index = 0; index < missionVillage.activeAnimalCount; index += 1) {
      const animal = missionVillage.animals[index];
      const root = animal.group;
      root.position.y = animal.anchorY;
      root.rotation.x = 0;
      root.rotation.z = 0;
      if (animal.behavior === "wandering") {
        const angle = elapsed * 0.16 + animal.phase;
        root.position.x = animal.anchorX + Math.cos(angle) * animal.radius;
        root.position.z = animal.anchorZ + Math.sin(angle) * animal.radius;
        root.rotation.y = -angle + Math.PI * 0.5;
      } else {
        root.position.x = animal.anchorX;
        root.position.z = animal.anchorZ;
        root.rotation.y = animal.baseRotation;
        if (animal.behavior === "grazing") {
          root.rotation.z = -0.1 + Math.sin(elapsed * 0.8 + animal.phase) * 0.025;
        }
      }
    }
  }

  function placeCheckpoint(index, sample) {
    const marker = checkpointMarkers[index];
    if (!marker) return;
    placeMarker(
      marker,
      sample,
      0.018,
      Math.max(0.84, sample.width / 16.6),
    );
  }

  function setCheckpointTriggered(index, triggered) {
    const marker = checkpointMarkers[index];
    if (marker) marker.visible = !triggered;
  }

  function resetMissionMarkers() {
    destinationMarker.visible = false;
    for (let index = 0; index < checkpointMarkers.length; index += 1) {
      checkpointMarkers[index].visible = false;
    }
  }

  function checkImpact(position, heading) {
    const sideX = Math.cos(heading);
    const sideZ = -Math.sin(heading);
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    for (const obstacle of obstacles) {
      if (!obstacle.active || obstacle.hit) continue;
      const dx = obstacle.x - position.x;
      const dz = obstacle.z - position.z;
      const lateral = dx * sideX + dz * sideZ;
      const forward = dx * forwardX + dz * forwardZ;
      const width = 1.35 + obstacle.radius;
      if (Math.abs(lateral) <= width && forward >= -3.25 - obstacle.radius && forward <= 4.8 + obstacle.radius) {
        obstacle.hit = true;
        return {
          type: obstacle.type,
          severity: obstacle.severity,
          side: THREE.MathUtils.clamp(lateral / width, -1, 1),
        };
      }
    }
    for (const event of events) {
      if (!event.active || event.hit) continue;
      for (
        let partIndex = 0;
        partIndex < event.collisionParts.length;
        partIndex += 1
      ) {
        const part = event.collisionParts[partIndex];
        if (!part.active) continue;
        const dx = part.x - position.x;
        const dz = part.z - position.z;
        const lateral = dx * sideX + dz * sideZ;
        const forward = dx * forwardX + dz * forwardZ;
        const width = 1.35 + part.radius;
        if (
          Math.abs(lateral) <= width
          && forward >= -3.25 - part.radius
          && forward <= 4.8 + part.radius
        ) {
          event.hit = true;
          return {
            type: event.type,
            severity: event.severity,
            side: THREE.MathUtils.clamp(lateral / width, -1, 1),
          };
        }
      }
    }
    return null;
  }

  function sampleSurface(position, target = {}) {
    let roughness = 0.08;
    let roll = Math.sin(position.z * 0.18 + position.x * 0.31) * 0.12;
    for (const obstacle of obstacles) {
      if (!obstacle.active || obstacle.type !== HAZARD_POTHOLE) continue;
      const dx = position.x - obstacle.x;
      const dz = position.z - obstacle.z;
      const reach = obstacle.radius + 2.1;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared >= reach * reach) continue;
      const influence = 1 - Math.sqrt(distanceSquared) / reach;
      roughness = Math.max(roughness, obstacle.roughness * influence);
      roll += THREE.MathUtils.clamp(dx / reach, -1, 1) * influence;
    }
    target.roughness = THREE.MathUtils.clamp(roughness, 0, 1);
    target.roll = THREE.MathUtils.clamp(roll, -1, 1);
    return target;
  }

  function reset() {
    resetHazards();
    resetEvents();
    resetRouteNetwork();
    resetMissionMarkers();
    resetVillage();
  }

  return {
    group,
    missionGroup,
    hazardGroup,
    eventGroup,
    routeNetworkGroup,
    directionVillagerGroup,
    hazards: obstacles,
    events,
    directionVillagers,
    destinationMarker,
    missionVillage,
    checkpointMarkers,
    checkImpact,
    sampleSurface,
    placeDestination,
    configureVillage,
    updateVillage,
    villageDebug,
    resetVillage,
    placeCheckpoint,
    setCheckpointTriggered,
    resetMissionMarkers,
    configureHazards,
    configureEvents,
    configureRouteNetwork,
    setVillagerGuidance,
    resetHazards,
    resetEvents,
    resetRouteNetwork,
    reset,
  };
}
