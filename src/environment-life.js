import * as THREE from "three";
import { DynamicWorldAI } from "./dynamic-world-ai.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const SKIN = new THREE.MeshStandardMaterial({ color: 0x9b623d, roughness: 0.9 });
const SKIN_DARK = new THREE.MeshStandardMaterial({ color: 0x75472d, roughness: 0.9 });
const HAIR = new THREE.MeshStandardMaterial({ color: 0x29231f, roughness: 0.95 });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xe9dfc6, roughness: 0.92 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x332a24, roughness: 0.94 });
const COW_HIDE = new THREE.MeshStandardMaterial({ color: 0xdfd5b9, roughness: 0.92 });
const COW_PATCH = new THREE.MeshStandardMaterial({ color: 0x8b6a48, roughness: 0.93 });
const BUFFALO_HIDE = new THREE.MeshStandardMaterial({ color: 0x484841, roughness: 0.96 });
const HORN = new THREE.MeshStandardMaterial({ color: 0xd9c9a5, roughness: 0.88 });
const CHICKEN_BROWN = new THREE.MeshStandardMaterial({ color: 0x9b542f, roughness: 0.92 });
const CHICKEN_CREAM = new THREE.MeshStandardMaterial({ color: 0xd8b978, roughness: 0.92 });
const CHICKEN_RED = new THREE.MeshStandardMaterial({ color: 0xb33e2f, roughness: 0.9 });
const METAL = new THREE.MeshStandardMaterial({ color: 0x363b3b, roughness: 0.72 });
const BIKE_SEAT = new THREE.MeshStandardMaterial({ color: 0x513522, roughness: 0.9 });
const BASKET = new THREE.MeshStandardMaterial({ color: 0x9a6a35, roughness: 0.96 });
const BROOM = new THREE.MeshStandardMaterial({ color: 0xb49250, roughness: 0.98 });
const SMOKE = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = 180.0 / max(1.0, -viewPosition.z);
      vAlpha = alpha;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float distanceToCenter = length(gl_PointCoord - vec2(0.5));
      float softEdge = 1.0 - smoothstep(0.16, 0.5, distanceToCenter);
      gl_FragColor = vec4(vec3(0.68), vAlpha * 0.42 * softEdge);
    }
  `,
});

const CLOTHING = [
  0xb84e3d,
  0xd49d36,
  0x3f7891,
  0x6e8744,
  0x9e5277,
  0xd16d3f,
  0x496f63,
].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));

const geometry = {
  head: new THREE.SphereGeometry(0.22, 7, 5),
  childHead: new THREE.SphereGeometry(0.19, 7, 5),
  torso: new THREE.CylinderGeometry(0.29, 0.39, 0.86, 6),
  childTorso: new THREE.CylinderGeometry(0.22, 0.29, 0.62, 6),
  adultLower: new THREE.CylinderGeometry(0.27, 0.31, 0.62, 6),
  childLower: new THREE.CylinderGeometry(0.2, 0.23, 0.42, 6),
  sari: new THREE.ConeGeometry(0.48, 1.18, 7),
  limb: new THREE.CylinderGeometry(0.075, 0.09, 0.62, 6),
  childLimb: new THREE.CylinderGeometry(0.058, 0.07, 0.48, 6),
  turban: new THREE.CylinderGeometry(0.26, 0.27, 0.18, 8),
  cowBody: new THREE.CapsuleGeometry(0.55, 1.15, 3, 7),
  cowHead: new THREE.BoxGeometry(0.62, 0.5, 0.72),
  cowLeg: new THREE.CylinderGeometry(0.1, 0.085, 0.82, 6),
  tail: new THREE.CylinderGeometry(0.035, 0.025, 0.72, 5),
  horn: new THREE.ConeGeometry(0.075, 0.38, 6),
  chickenBody: new THREE.SphereGeometry(0.24, 6, 5),
  chickenHead: new THREE.SphereGeometry(0.13, 6, 5),
  chickenLeg: new THREE.CylinderGeometry(0.025, 0.025, 0.28, 5),
  adultHair: new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  childHair: new THREE.SphereGeometry(0.195, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  femaleHair: new THREE.SphereGeometry(0.225, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  bikeWheel: new THREE.TorusGeometry(0.48, 0.035, 5, 14),
  bikeTube: new THREE.CylinderGeometry(0.035, 0.035, 1, 6),
  basket: new THREE.CylinderGeometry(0.2, 0.28, 0.32, 8),
  broom: new THREE.CylinderGeometry(0.035, 0.055, 1.35, 6),
};

function mesh(shape, material, castShadow = true) {
  const object = new THREE.Mesh(shape, material);
  object.castShadow = castShadow;
  object.receiveShadow = true;
  return object;
}

function rodBetween(start, end, radiusMaterial = METAL) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = mesh(geometry.bikeTube, radiusMaterial);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.scale.y = direction.length();
  rod.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  return rod;
}

function createLimb(shape, material, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const limb = mesh(shape, material);
  limb.position.y = -shape.parameters.height / 2;
  pivot.add(limb);
  return pivot;
}

function createVillager(kind, clothing, phase) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const isChild = kind === "child";
  const isFemale = kind === "female";
  const heightScale = isChild ? 0.78 : 1;
  const skin = phase % 1 > 0.48 ? SKIN_DARK : SKIN;

  const torso = mesh(
    isFemale ? geometry.sari : isChild ? geometry.childTorso : geometry.torso,
    clothing,
  );
  torso.position.y = isFemale ? 1.05 : isChild ? 0.91 : 1.18;
  body.add(torso);

  if (!isFemale) {
    const lower = mesh(
      isChild ? geometry.childLower : geometry.adultLower,
      WHITE,
    );
    lower.position.y = isChild ? 0.48 : 0.63;
    body.add(lower);
  }

  const headPivot = new THREE.Group();
  headPivot.position.y = isChild ? 1.48 : 1.88;
  const head = mesh(isChild ? geometry.childHead : geometry.head, skin);
  headPivot.add(head);
  body.add(headPivot);

  if (isFemale) {
    const hair = mesh(geometry.femaleHair, HAIR);
    hair.position.y = 0.04;
    headPivot.add(hair);
    const scarf = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.58), clothing);
    scarf.position.set(0, -0.08, -0.11);
    scarf.rotation.x = 0.16;
    headPivot.add(scarf);
  } else if (!isChild && phase % 1 > 0.35) {
    const turban = mesh(geometry.turban, clothing);
    turban.position.y = 0.2;
    headPivot.add(turban);
  } else {
    const hair = mesh(isChild ? geometry.childHair : geometry.adultHair, HAIR);
    hair.position.y = 0.06;
    headPivot.add(hair);
  }

  const limbShape = isChild ? geometry.childLimb : geometry.limb;
  const shoulderY = isChild ? 1.15 : 1.51;
  const hipY = isChild ? 0.68 : 0.83;
  const armX = isChild ? 0.25 : 0.34;
  const legX = isChild ? 0.13 : 0.17;
  const leftArm = createLimb(limbShape, clothing, -armX, shoulderY, 0);
  const rightArm = createLimb(limbShape, clothing, armX, shoulderY, 0);
  const leftLeg = createLimb(limbShape, skin, -legX, hipY, 0);
  const rightLeg = createLimb(limbShape, skin, legX, hipY, 0);
  body.add(leftArm, rightArm, leftLeg, rightLeg);
  const basket = mesh(geometry.basket, BASKET);
  basket.position.set(0.45, isChild ? 0.72 : 0.9, 0.08);
  basket.visible = false;
  const broom = mesh(geometry.broom, BROOM);
  broom.position.set(0.4, 0.62, 0.18);
  broom.rotation.z = -0.32;
  broom.visible = false;
  body.add(basket, broom);
  body.scale.setScalar(heightScale);

  return {
    root,
    body,
    head: headPivot,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    basket,
    broom,
    kind,
    phase,
    home: new THREE.Vector3(),
    baseRotation: 0,
    behavior: "idle",
    walkAxis: new THREE.Vector3(0, 0, 1),
    walkRange: 0,
  };
}

function createLargeAnimal(kind, phase) {
  const root = new THREE.Group();
  const body = mesh(geometry.cowBody, kind === "buffalo" ? BUFFALO_HIDE : COW_HIDE);
  body.rotation.x = Math.PI / 2;
  body.position.y = 1.15;
  if (kind === "buffalo") body.scale.set(1.08, 1.1, 1.08);
  root.add(body);

  if (kind === "cow") {
    const patch = mesh(new THREE.SphereGeometry(0.36, 6, 5), COW_PATCH);
    patch.scale.set(1.1, 0.55, 0.35);
    patch.position.set(0.49, 1.25, -0.2);
    root.add(patch);
  }

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.26, 1.13);
  const head = mesh(geometry.cowHead, kind === "buffalo" ? BUFFALO_HIDE : COW_HIDE);
  head.position.z = 0.16;
  headPivot.add(head);
  [-1, 1].forEach((side) => {
    const horn = mesh(geometry.horn, HORN);
    horn.position.set(side * 0.31, 0.34, 0.08);
    horn.rotation.z = side * -0.55;
    headPivot.add(horn);
  });
  root.add(headPivot);

  const legs = [];
  [-0.38, 0.38].forEach((x) => {
    [-0.58, 0.62].forEach((z) => {
      const leg = mesh(geometry.cowLeg, kind === "buffalo" ? BUFFALO_HIDE : COW_HIDE);
      leg.position.set(x, 0.46, z);
      root.add(leg);
      legs.push(leg);
    });
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.32, -1.03);
  const tail = mesh(geometry.tail, kind === "buffalo" ? BUFFALO_HIDE : COW_HIDE);
  tail.position.y = -0.34;
  tailPivot.add(tail);
  root.add(tailPivot);

  return {
    root,
    head: headPivot,
    tail: tailPivot,
    phase,
    kind,
    legs,
    home: new THREE.Vector3(),
    homeRotation: 0,
  };
}

function createChicken(material, phase) {
  const root = new THREE.Group();
  const body = mesh(geometry.chickenBody, material);
  body.scale.set(0.82, 1, 1.16);
  body.position.y = 0.42;
  const head = mesh(geometry.chickenHead, material);
  head.position.set(0, 0.66, 0.22);
  const comb = mesh(new THREE.ConeGeometry(0.07, 0.16, 4), CHICKEN_RED);
  comb.position.set(0, 0.82, 0.2);
  root.add(body, head, comb);
  const legs = [];
  [-0.08, 0.08].forEach((x) => {
    const leg = mesh(geometry.chickenLeg, CHICKEN_BROWN);
    leg.position.set(x, 0.14, 0);
    root.add(leg);
    legs.push(leg);
  });
  return {
    root,
    head,
    phase,
    legs,
    home: new THREE.Vector3(),
    radius: 0.9 + (phase % 1) * 0.7,
  };
}

function createBicycle(frameMaterial) {
  const bike = new THREE.Group();
  [-0.63, 0.63].forEach((z) => {
    const wheel = mesh(geometry.bikeWheel, METAL);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.5, z);
    bike.add(wheel);
  });
  const rearHub = new THREE.Vector3(0, 0.5, -0.63);
  const frontHub = new THREE.Vector3(0, 0.5, 0.63);
  const crank = new THREE.Vector3(0, 0.52, -0.05);
  const seatTop = new THREE.Vector3(0, 1.18, -0.23);
  const handleTop = new THREE.Vector3(0, 1.22, 0.48);
  bike.add(
    rodBetween(rearHub, crank, frameMaterial),
    rodBetween(crank, frontHub, frameMaterial),
    rodBetween(rearHub, seatTop, frameMaterial),
    rodBetween(seatTop, crank, frameMaterial),
    rodBetween(seatTop, handleTop, frameMaterial),
    rodBetween(frontHub, handleTop, frameMaterial),
  );
  const seat = mesh(new THREE.BoxGeometry(0.18, 0.08, 0.38), BIKE_SEAT);
  seat.position.copy(seatTop);
  bike.add(seat);
  return bike;
}

function createSmoke(origin, phase) {
  const count = 8;
  const positions = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const particles = [];
  for (let index = 0; index < count; index += 1) {
    const life = ((index / count) + phase) % 1;
    particles.push({ life, offset: (index % 3 - 1) * 0.08 });
  }
  const smoke = new THREE.Points(new THREE.BufferGeometry(), SMOKE);
  smoke.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  smoke.geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
  smoke.position.copy(origin);
  smoke.frustumCulled = false;
  return { smoke, positions, alphas, particles, phase };
}

function placeVillagers(scene, random) {
  const placements = [
    ["male", -17.5, 34, "look"], ["female", -17.8, 39.5, "idle"],
    ["child", -14.2, 43, "wave"], ["female", 20.5, 50, "walk"],
    ["male", 20.2, 46.5, "idle"], ["male", -17, 92, "walk"],
    ["child", 14.3, 119, "wave"], ["female", 22.5, 124, "idle"],
    ["male", -14.5, 181, "look"], ["female", 18, 249, "walk"],
    ["child", 13.2, 254, "wave"], ["male", -22, -62, "idle"],
    ["female", -17.5, -67, "walk"],
  ];
  return placements.map(([kind, x, z, behavior], index) => {
    const phase = random() * Math.PI * 2;
    const clothing = CLOTHING[Math.floor(random() * CLOTHING.length)];
    const villager = createVillager(kind, clothing, phase);
    villager.home.set(x + (random() - 0.5) * 1.8, 0, z + (random() - 0.5) * 2.4);
    villager.root.position.copy(villager.home);
    villager.baseRotation = (x < 0 ? Math.PI / 2 : -Math.PI / 2) + (random() - 0.5) * 0.5;
    villager.root.rotation.y = villager.baseRotation;
    villager.behavior = behavior;
    villager.walkAxis.set(index % 2 ? 0 : 1, 0, index % 2 ? 1 : 0);
    villager.walkRange = behavior === "walk" ? 1.2 + random() * 1.1 : 0;
    scene.add(villager.root);
    return villager;
  });
}

function placeAnimals(scene, random) {
  const placements = [
    ["cow", -31, 12], ["cow", 35, 64], ["buffalo", -37, 128],
    ["cow", 33, 201], ["buffalo", -34, 287], ["cow", 39, -82],
    ["buffalo", 36, 331],
  ];
  return placements.map(([kind, x, z]) => {
    const animal = createLargeAnimal(kind, random() * Math.PI * 2);
    animal.root.position.set(x + (random() - 0.5) * 3, 0, z + (random() - 0.5) * 4);
    animal.home.copy(animal.root.position);
    animal.homeRotation = random() * Math.PI * 2;
    animal.root.rotation.y = animal.homeRotation;
    scene.add(animal.root);
    return animal;
  });
}

function placeChickens(scene, random) {
  const placements = [
    [-23, 36], [-20, 42], [21, 48], [27, 52], [-25.5, 94], [25, 119],
  ];
  return placements.map(([x, z], index) => {
    const chicken = createChicken(index % 2 ? CHICKEN_CREAM : CHICKEN_BROWN, random() * Math.PI * 2);
    chicken.home.set(x + (random() - 0.5) * 1.5, 0, z + (random() - 0.5) * 1.5);
    chicken.root.position.copy(chicken.home);
    chicken.root.rotation.y = random() * Math.PI * 2;
    scene.add(chicken.root);
    return chicken;
  });
}

function placeBicycles(scene, random) {
  const placements = [
    [-18.8, 31, 0.18], [22, 43, -0.1], [-27.5, 88, 0.24], [24.5, 247, -0.18],
  ];
  return placements.map(([x, z, rotation], index) => {
    const bike = createBicycle(CLOTHING[(index + 2) % CLOTHING.length]);
    bike.position.set(x + (random() - 0.5), 0, z + (random() - 0.5));
    bike.rotation.y = rotation + (x < 0 ? Math.PI / 2 : -Math.PI / 2);
    bike.rotation.z = x < 0 ? 0.08 : -0.08;
    scene.add(bike);
    return bike;
  });
}

function placeSmoke(scene, random) {
  return [
    new THREE.Vector3(-21.8, 5.1, 37.3),
    new THREE.Vector3(28.2, 5.05, 120),
  ].map((origin) => {
    const smoke = createSmoke(origin, random());
    scene.add(smoke.smoke);
    return smoke;
  });
}

function squaredDistanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function turnToward(object, target, delta, amount = 1) {
  const targetAngle = Math.atan2(target.x - object.position.x, target.z - object.position.z);
  const difference = Math.atan2(
    Math.sin(targetAngle - object.rotation.y),
    Math.cos(targetAngle - object.rotation.y),
  );
  object.rotation.y += difference * (1 - Math.exp(-2.2 * delta)) * amount;
}

export function createVillageLife(scene, { random, windTargets = [] }) {
  const villagers = placeVillagers(scene, random);
  const animals = placeAnimals(scene, random);
  const chickens = placeChickens(scene, random);
  const bicycles = placeBicycles(scene, random);
  const smokeSources = placeSmoke(scene, random);
  const worldAI = new DynamicWorldAI({
    scene,
    villagers,
    animals,
    chickens,
    random,
    windTargets,
    smokeSources,
  });

  function update({ cartPosition, cartSpeed = 0, elapsed, delta }) {
    worldAI.update(cartPosition, cartSpeed, elapsed, delta);
  }

  return {
    update,
    setAudioManager: (audioManager) => worldAI.setAudioManager(audioManager),
    debug: worldAI.debug,
    managers: {
      npc: worldAI.npcManager,
      animals: worldAI.animalManager,
      ambientEvents: worldAI.ambientEvents,
      spawn: worldAI.spawnManager,
    },
    counts: {
      villagers: villagers.length,
      animals: animals.length,
      chickens: chickens.length,
      bicycles: bicycles.length,
      smokeParticles: smokeSources.length * 8,
    },
  };
}
