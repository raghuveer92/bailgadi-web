import * as THREE from "three";

export const CHUNK_LENGTH = 80;
export const DEFAULT_ACTIVE_CHUNKS = 7;
export const DEFAULT_CHUNK_POOL_SIZE = 9;
export const SURFACE_ROAD = "ROAD";
export const SURFACE_DIRT = "DIRT";
export const SURFACE_GRASS = "GRASS";
export const SURFACE_GRAVEL = "GRAVEL";
export const SURFACE_MUD = "MUD";
export const MAX_ROUTE_HAZARDS = 24;
export const MAX_ROUTE_EVENTS = 8;
export const MAX_ROUTE_JUNCTIONS = 3;

export const HAZARD_ROCK = "rock";
export const HAZARD_FALLEN_BRANCH = "fallen-branch";
export const HAZARD_WOODEN_LOG = "wooden-log";
export const HAZARD_POTHOLE = "pothole";
export const HAZARD_BROKEN_CART_WHEEL = "broken-cart-wheel";
export const HAZARD_HAY_BUNDLE = "hay-bundle";
export const EVENT_BROKEN_BULLOCK_CART = "broken-bullock-cart";
export const EVENT_CATTLE_CROSSING = "cattle-crossing";
export const EVENT_VILLAGE_CROWD = "village-crowd";
export const EVENT_ROAD_REPAIR = "road-repair";
export const EVENT_MARKET_SPILL = "small-market-spill";
export const EVENT_WATER_PUDDLE = "water-puddle";
export const JUNCTION_LEFT_RIGHT = "left-right-fork";
export const JUNCTION_STRAIGHT_LEFT = "straight-left";
export const JUNCTION_STRAIGHT_RIGHT = "straight-right";
export const JUNCTION_THREE_WAY = "three-way";

const ROAD_SEGMENTS = 24;
const SURFACE_CENTER_RATIO = 0.65;
const SURFACE_SHOULDER_WIDTH = 3.5;
const GROUND_SEGMENTS = 8;
const MAX_TREES = 26;
const MAX_CROPS = 110;
const MAX_GRASS = 72;
const MAX_BUSHES = 24;
const MAX_ROCKS = 18;
const MAX_HOUSES = 14;
const MAX_ROADSIDE_PROPS = 22;
const MAX_POTS = 8;
const MAX_WOOD_PILES = 8;
const MAX_SIGNS = 5;
const MAX_EVENT_PEOPLE = 20;
const OBSTACLES_PER_CHUNK = 10;
const WORLD_HALF_WIDTH = 135;
const HAZARD_START_CLEARANCE = 58;
const HAZARD_DESTINATION_CLEARANCE = 24;
const HAZARD_CHECKPOINT_CLEARANCE = 14;
const EVENT_START_CLEARANCE = 62;
const EVENT_DESTINATION_CLEARANCE = 30;
const EVENT_CHECKPOINT_CLEARANCE = 18;
const EVENT_HAZARD_CLEARANCE = 2.5;

const ROAD_LAYOUTS = Object.freeze([
  "Straight",
  "Gentle Left Curve",
  "Gentle Right Curve",
  "S-Curve",
  "Fork-Ready Section",
  "Narrow Village Lane",
  "Wide Rural Road",
  "Slight Uphill",
  "Slight Downhill",
  "Uneven Road",
]);

const THEME_DEFINITIONS = Object.freeze([
  { name: "Wheat Fields", color: 0xb2a747, crop: 0xd2be55, trees: 4, crops: 92 },
  { name: "Rice Fields", color: 0x6f9b42, crop: 0x8fbf4d, trees: 5, crops: 100 },
  { name: "Open Grassland", color: 0x76a04a, crop: 0x9fb55b, trees: 3, crops: 8 },
  { name: "Mango Orchard", color: 0x668d40, crop: 0x8baa4e, trees: 22, crops: 0 },
  { name: "Banyan Tree Area", color: 0x587d3c, crop: 0x849d4c, trees: 10, crops: 0 },
  { name: "Small Forest", color: 0x456f39, crop: 0x698c42, trees: 26, crops: 0 },
  { name: "Pond", color: 0x6e9449, crop: 0x91aa55, trees: 10, crops: 5 },
  { name: "Canal", color: 0x71984b, crop: 0x9ab257, trees: 8, crops: 36 },
  { name: "Village Outskirts", color: 0x7f9b4d, crop: 0xa6aa58, trees: 12, crops: 24 },
  { name: "Village Centre", color: 0x8e9b53, crop: 0xb0a95e, trees: 9, crops: 0 },
]);

export const REGION_TYPES = Object.freeze([
  "Farming",
  "Forest",
  "Riverside",
  "Dry Plains",
  "Rocky Area",
]);

const REGION_DEFINITIONS = Object.freeze({
  Farming: Object.freeze({
    climate: "temperate",
    tint: 0xa8cee0,
    themes: Object.freeze([0, 1, 8, 9]),
    treeFactor: 0.8,
    cropFactor: 1.25,
    bushFactor: 0.8,
    rockFactor: 0.55,
  }),
  Forest: Object.freeze({
    climate: "cool-humid",
    tint: 0x93bcc8,
    themes: Object.freeze([3, 4, 5]),
    treeFactor: 1.35,
    cropFactor: 0.15,
    bushFactor: 1.2,
    rockFactor: 1.05,
  }),
  Riverside: Object.freeze({
    climate: "humid",
    tint: 0x9fcbd8,
    themes: Object.freeze([6, 7, 1]),
    treeFactor: 1,
    cropFactor: 0.65,
    bushFactor: 1,
    rockFactor: 0.65,
  }),
  "Dry Plains": Object.freeze({
    climate: "hot-dry",
    tint: 0xd5c59f,
    themes: Object.freeze([2, 4]),
    treeFactor: 0.38,
    cropFactor: 0.08,
    bushFactor: 0.7,
    rockFactor: 0.75,
  }),
  "Rocky Area": Object.freeze({
    climate: "dry-highland",
    tint: 0xb8b9ae,
    themes: Object.freeze([2, 5]),
    treeFactor: 0.45,
    cropFactor: 0.05,
    bushFactor: 0.55,
    rockFactor: 1.8,
  }),
});

const VILLAGE_NAMES = Object.freeze([
  "Rampur",
  "Sundarpur",
  "Devgaon",
  "Madhopur",
  "Nandigram",
  "Amarpura",
  "Sonwadi",
  "Kesarwadi",
]);

const VILLAGE_THEMES = Object.freeze([
  "Wheat Hamlet",
  "Orchard Village",
  "Riverside Settlement",
  "Potters' Village",
]);

const DELIVERY_LOCATIONS = Object.freeze([
  "Grain Market",
  "Village Shop",
  "Warehouse",
  "Farmer House",
  "Milk Collection Centre",
]);

const LANDMARKS = Object.freeze([
  "Giant Banyan Tree",
  "Windmill",
  "Old Temple",
  "River Bridge",
  "Water Tower",
  "Village Gate",
  "Ancient Well",
]);

const WORLD_EVENTS = Object.freeze([
  "Wedding Procession",
  "Farmers Harvesting",
  "Shepherd with Goats",
  "Opposite Bullock Cart",
  "School Children Walking",
  "Weekly Market",
]);

const materials = {
  road: new THREE.MeshStandardMaterial({ color: 0xb98550, roughness: 0.94 }),
  roadTrack: new THREE.MeshStandardMaterial({ color: 0x9b6b40, roughness: 0.96 }),
  ground: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    side: THREE.DoubleSide,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x654326, roughness: 0.94 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f7037, roughness: 0.96 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x5a873f, roughness: 0.96 }),
  crop: THEME_DEFINITIONS.map(
    (theme) => new THREE.MeshStandardMaterial({ color: theme.crop, roughness: 0.98 }),
  ),
  grass: new THREE.MeshStandardMaterial({ color: 0xa79549, roughness: 0.98 }),
  bush: new THREE.MeshStandardMaterial({ color: 0x527738, roughness: 0.98 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x817a6c, roughness: 0.96 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0xd7ad70, roughness: 0.92 }),
  plasterBlue: new THREE.MeshStandardMaterial({ color: 0x73a5a2, roughness: 0.92 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xa45232, roughness: 0.94 }),
  roofStraw: new THREE.MeshStandardMaterial({ color: 0xc29a54, roughness: 0.98 }),
  clay: new THREE.MeshStandardMaterial({ color: 0xa85f3d, roughness: 0.94 }),
  hay: new THREE.MeshStandardMaterial({ color: 0xc9a84e, roughness: 0.98 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x65a9b3,
    roughness: 0.35,
    transparent: true,
    opacity: 0.82,
  }),
  dark: new THREE.MeshStandardMaterial({ color: 0x39312a, roughness: 0.9 }),
  bright: new THREE.MeshStandardMaterial({ color: 0xe0ad3e, roughness: 0.9 }),
  event: new THREE.MeshStandardMaterial({ color: 0xc9533e, roughness: 0.9 }),
};

const geometries = {
  track: new THREE.BoxGeometry(0.2, 0.025, 4.8),
  treeTrunk: new THREE.CylinderGeometry(0.28, 0.42, 3.2, 7),
  treeCrown: new THREE.DodecahedronGeometry(1.3, 0),
  crop: new THREE.ConeGeometry(0.15, 0.76, 5),
  grass: new THREE.ConeGeometry(0.13, 0.64, 5),
  bush: new THREE.DodecahedronGeometry(0.65, 0),
  rock: new THREE.DodecahedronGeometry(0.45, 0),
  house: new THREE.BoxGeometry(4.6, 3, 4),
  roof: new THREE.ConeGeometry(3.45, 1.8, 4),
  prop: new THREE.BoxGeometry(0.4, 1.2, 1.2),
  person: new THREE.CylinderGeometry(0.17, 0.23, 1.25, 6),
  water: new THREE.PlaneGeometry(1, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  sphere: new THREE.SphereGeometry(0.5, 8, 6),
  torus: new THREE.TorusGeometry(0.5, 0.09, 6, 14),
};

const sharedColorA = new THREE.Color();
const sharedColorB = new THREE.Color();

function hashUint(seed, index, salt = 0) {
  let value = (seed ^ Math.imul(index + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function hash01(seed, index, salt = 0) {
  return hashUint(seed, index, salt) / 4294967295;
}

function regionLengthFor(seed, regionIndex) {
  return 500 + (hashUint(seed, regionIndex, 3000) % 1501);
}

function regionTypeIndexFor(seed, regionIndex) {
  const block = Math.floor(regionIndex / REGION_TYPES.length);
  const position = (
    (regionIndex % REGION_TYPES.length) + REGION_TYPES.length
  ) % REGION_TYPES.length;
  return (
    (hashUint(seed, block, 3001) % REGION_TYPES.length) + position
  ) % REGION_TYPES.length;
}

function locateRegion(seed, routeDistance, target) {
  const zeroLength = regionLengthFor(seed, 0);
  const zeroOffset = hashUint(seed, 0, 3002) % zeroLength;
  const zeroStart = -zeroOffset;
  const zeroEnd = zeroStart + zeroLength;
  let regionIndex = 0;
  let startRouteDistance = zeroStart;
  let endRouteDistance = zeroEnd;

  if (routeDistance >= zeroEnd) {
    regionIndex = 1;
    startRouteDistance = zeroEnd;
    while (true) {
      endRouteDistance = (
        startRouteDistance + regionLengthFor(seed, regionIndex)
      );
      if (routeDistance < endRouteDistance) break;
      startRouteDistance = endRouteDistance;
      regionIndex += 1;
    }
  } else if (routeDistance < zeroStart) {
    regionIndex = -1;
    endRouteDistance = zeroStart;
    while (true) {
      startRouteDistance = (
        endRouteDistance - regionLengthFor(seed, regionIndex)
      );
      if (routeDistance >= startRouteDistance) break;
      endRouteDistance = startRouteDistance;
      regionIndex -= 1;
    }
  }

  target.index = regionIndex;
  target.startRouteDistance = startRouteDistance;
  target.endRouteDistance = endRouteDistance;
  return target;
}

export function generateRegionDescriptor(seed, routeDistance, target = {}) {
  locateRegion(seed >>> 0, routeDistance, target);
  const type = REGION_TYPES[regionTypeIndexFor(seed, target.index)];
  const regionSeed = hashUint(seed, target.index, 3003);
  target.id = `region-${target.index < 0 ? `n${-target.index}` : target.index}-${
    regionSeed.toString(16).padStart(8, "0")
  }`;
  target.type = type;
  target.seed = regionSeed;
  target.climate = REGION_DEFINITIONS[type].climate;
  return target;
}

function regionTypeAtDistance(seed, routeDistance) {
  const bounds = locateRegion(seed, routeDistance, sharedRegionBounds);
  return REGION_TYPES[regionTypeIndexFor(seed, bounds.index)];
}

const sharedRegionBounds = {
  index: 0,
  startRouteDistance: 0,
  endRouteDistance: 0,
};

function slugifyVillageName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function generateVillageDescriptor(
  seed,
  routeDistance,
  difficulty = 1,
  missionKey = 0,
  preferredName = "",
  target = {},
  regionDescriptor = null,
) {
  const villageSeed = hashUint(seed >>> 0, missionKey, 2400);
  const name = preferredName || VILLAGE_NAMES[
    hashUint(villageSeed, missionKey, 2401) % VILLAGE_NAMES.length
  ];
  const size = 8 + (hashUint(villageSeed, missionKey, 2402) % 13);
  const population = Math.min(
    28,
    8 + Math.floor(size * 0.7) + (hashUint(villageSeed, missionKey, 2403) % 5),
  );
  const entranceDistance = 50 + (hashUint(villageSeed, missionKey, 2404) % 9);
  const deliverySide = hash01(villageSeed, missionKey, 2405) > 0.5 ? 1 : -1;
  const deliveryType = DELIVERY_LOCATIONS[
    hashUint(villageSeed, missionKey, 2406) % DELIVERY_LOCATIONS.length
  ];

  target.id = `${slugifyVillageName(name)}-${villageSeed.toString(16).padStart(8, "0")}`;
  target.name = name;
  target.routeDistance = routeDistance;
  const regionType = regionDescriptor
    ? regionDescriptor.type
    : regionTypeAtDistance(seed, routeDistance);
  target.theme = regionType === "Farming"
    ? "Wheat Hamlet"
    : regionType === "Forest"
      ? "Orchard Village"
      : regionType === "Riverside"
        ? "Riverside Settlement"
        : VILLAGE_THEMES[
          hashUint(villageSeed, missionKey, 2407) % VILLAGE_THEMES.length
        ];
  target.region = {
    id: regionDescriptor ? regionDescriptor.id : "generated-region",
    type: regionType,
    climate: regionDescriptor
      ? regionDescriptor.climate
      : REGION_DEFINITIONS[regionType].climate,
  };
  target.size = size;
  target.seed = villageSeed;
  target.population = population;
  target.populationBreakdown = {
    children: Math.max(2, Math.floor(population * 0.28)),
    farmers: Math.max(2, Math.floor(population * 0.34)),
    potCarriers: Math.max(1, Math.floor(population * 0.2)),
    cattle: 2 + (hashUint(villageSeed, missionKey, 2408) % 3),
    buffaloes: 1 + (hashUint(villageSeed, missionKey, 2409) % 2),
  };
  target.entrance = {
    routeDistance: routeDistance - entranceDistance,
    label: `Welcome to ${name}`,
  };
  target.square = {
    routeDistance: routeDistance - 21,
    radius: 13 + (size > 14 ? 2 : 0),
  };
  target.deliveryPoint = {
    id: `${target.id}-delivery`,
    type: deliveryType,
    routeDistance,
    lateralOffset: deliverySide * (4.2 + hash01(villageSeed, missionKey, 2410) * 1.2),
  };
  target.landmark = hash01(villageSeed, missionKey, 2411) > 0.5
    ? "Temple"
    : "Banyan Tree";
  const landmarkSide = deliverySide * -1;
  target.activityZones = [
    {
      id: `${target.id}-square`,
      type: "village-square",
      routeDistance: target.square.routeDistance,
      lateralOffset: 0,
      radius: target.square.radius,
    },
    {
      id: `${target.id}-tea-stall`,
      type: "tea-stall",
      routeDistance: routeDistance - 31,
      lateralOffset: deliverySide * -10.5,
      radius: 5,
    },
    {
      id: `${target.id}-landmark`,
      type: target.landmark === "Temple" ? "temple-area" : "banyan-tree",
      routeDistance: target.square.routeDistance + 4,
      lateralOffset: landmarkSide * 10.5,
      radius: 6,
    },
    {
      id: `${target.id}-well`,
      type: "well",
      routeDistance: target.square.routeDistance - 3,
      lateralOffset: deliverySide * 8.5,
      radius: 4.5,
    },
    {
      id: `${target.id}-animal-shed`,
      type: "animal-shed",
      routeDistance: routeDistance - 13,
      lateralOffset: deliverySide * -15.5,
      radius: 6.5,
    },
    {
      id: `${target.id}-market`,
      type: deliveryType === "Grain Market" ? "grain-market" : "delivery-market",
      routeDistance: routeDistance - 2,
      lateralOffset: target.deliveryPoint.lateralOffset,
      radius: 6,
    },
    {
      id: `${target.id}-houses`,
      type: "houses",
      routeDistance: routeDistance - 25,
      lateralOffset: 0,
      radius: 28,
    },
  ];
  target.decorationCounts = {
    trees: Math.min(
      14,
      7 + (hashUint(villageSeed, missionKey, 2412) % 7)
        + (regionType === "Forest" ? 4 : 0),
    ),
    sheds: 1 + (hashUint(villageSeed, missionKey, 2413) % 2),
    carts: 1 + (hashUint(villageSeed, missionKey, 2414) % 2),
    fences: 8 + (hashUint(villageSeed, missionKey, 2415) % 7),
    waterPots: regionType === "Riverside" ? 6 : 3,
    boats: regionType === "Riverside" ? 2 : 0,
    grainStacks: regionType === "Farming" ? 6 : 2,
    hayStacks: regionType === "Farming" ? 5 : 2,
  };
  target.difficulty = difficulty;
  return target;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function createStripGeometry(segments, withColor = false) {
  const vertexCount = (segments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint16Array(segments * 6);
  const colors = withColor ? new Float32Array(vertexCount * 3) : null;
  for (let index = 0; index < segments; index += 1) {
    const vertex = index * 2;
    const offset = index * 6;
    indices[offset] = vertex;
    indices[offset + 1] = vertex + 2;
    indices[offset + 2] = vertex + 1;
    indices[offset + 3] = vertex + 1;
    indices[offset + 4] = vertex + 2;
    indices[offset + 5] = vertex + 3;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

function makeInstanced(geometry, material, maximum, castShadow = false) {
  const mesh = new THREE.InstancedMesh(geometry, material, maximum);
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  return mesh;
}

function prepareDynamicGeometry(mesh) {
  mesh.geometry.attributes.position.needsUpdate = true;
  if (mesh.geometry.attributes.color) mesh.geometry.attributes.color.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

function finalizeInstances(mesh, count) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (count > 0) mesh.computeBoundingSphere();
}

function setTransform(scratch, x, y, z, rotationY, scaleX, scaleY, scaleZ) {
  scratch.position.set(x, y, z);
  scratch.rotation.set(0, rotationY, 0);
  scratch.scale.set(scaleX, scaleY, scaleZ);
  scratch.updateMatrix();
}

function themeIndexFor(seed, chunkIndex) {
  const regionType = regionTypeAtDistance(
    seed,
    chunkIndex * CHUNK_LENGTH + CHUNK_LENGTH * 0.5,
  );
  const themes = REGION_DEFINITIONS[regionType].themes;
  return themes[hashUint(seed, chunkIndex, 91) % themes.length];
}

function edgeSurfaceTypeFor(themeIndex) {
  return themeIndex >= 8 ? SURFACE_ROAD : SURFACE_DIRT;
}

function offRoadSurfaceTypeFor(themeIndex) {
  return themeIndex === 7 || themeIndex >= 8
    ? SURFACE_GRAVEL
    : SURFACE_GRASS;
}

function farOffRoadSurfaceTypeFor(themeIndex) {
  return themeIndex === 1 || themeIndex === 6 || themeIndex === 7
    ? SURFACE_MUD
    : SURFACE_GRASS;
}

function surfaceTypeAt(themeIndex, distanceFromCenter, width) {
  const roadHalfWidth = width * 0.5;
  if (distanceFromCenter <= roadHalfWidth * SURFACE_CENTER_RATIO) {
    return SURFACE_ROAD;
  }
  if (distanceFromCenter <= roadHalfWidth) {
    return edgeSurfaceTypeFor(themeIndex);
  }
  if (distanceFromCenter <= roadHalfWidth + SURFACE_SHOULDER_WIDTH) {
    return offRoadSurfaceTypeFor(themeIndex);
  }
  return farOffRoadSurfaceTypeFor(themeIndex);
}

function roadLayoutIndexFor(seed, chunkIndex, difficulty) {
  let layoutIndex = hashUint(seed, chunkIndex, 11) % ROAD_LAYOUTS.length;
  const challenge = Math.max(0, difficulty - 1);
  const bias = hash01(seed, chunkIndex, 12);
  if (challenge >= 2 && bias < 0.16 + challenge * 0.035) {
    layoutIndex = 1 + (hashUint(seed, chunkIndex, 13) % 3);
  } else if (challenge >= 3 && bias > 0.82) {
    layoutIndex = 9;
  }
  return layoutIndex;
}

function chunkCenterOffset(seed, globalZ, difficulty) {
  const phaseA = (seed % 997) * 0.0063;
  const phaseB = (seed % 487) * 0.0129;
  const scale = 1 + Math.max(0, difficulty - 1) * 0.08;
  return (
    Math.sin(globalZ * 0.0085 + phaseA) * 1.8
    + Math.sin(globalZ * 0.0037 + phaseB) * 1.35
  ) * scale;
}

function localRoadOffset(layoutIndex, progress, difficulty) {
  const hump = 16 * progress * progress * (1 - progress) * (1 - progress);
  const curveScale = 1 + Math.max(0, difficulty - 1) * 0.11;
  if (layoutIndex === 1) return hump * 2.2 * curveScale;
  if (layoutIndex === 2) return -hump * 2.2 * curveScale;
  if (layoutIndex === 3) {
    return Math.sin(progress * Math.PI * 2) * hump * 1.55 * curveScale;
  }
  return 0;
}

function boundaryRoadWidth(seed, boundaryIndex, difficulty) {
  const difficultyNarrowing = Math.max(0, difficulty - 1) * 0.28;
  return 15.5 + (hash01(seed, boundaryIndex, 71) - 0.5) * 1.8 - difficultyNarrowing;
}

function roadWidthAt(seed, chunkIndex, layoutIndex, progress, difficulty) {
  const startWidth = boundaryRoadWidth(seed, chunkIndex, difficulty);
  const endWidth = boundaryRoadWidth(seed, chunkIndex + 1, difficulty);
  const hump = 16 * progress * progress * (1 - progress) * (1 - progress);
  let middleWidthOffset = 0;
  if (layoutIndex === 4) middleWidthOffset = 2.4 * hump;
  if (layoutIndex === 5) middleWidthOffset = -2.6 * hump;
  if (layoutIndex === 6) middleWidthOffset = 3.1 * hump;
  return THREE.MathUtils.lerp(startWidth, endWidth, smoothstep(progress))
    + middleWidthOffset;
}

function roadHeightAt(layoutIndex, globalZ, progress) {
  const elevationHump = 16 * progress * progress * (1 - progress) * (1 - progress);
  if (layoutIndex === 7) return 0.038 + elevationHump * 0.018;
  if (layoutIndex === 8) return 0.038 - elevationHump * 0.014;
  if (layoutIndex === 9) {
    return 0.038 + (
      Math.sin(globalZ * 0.7) * 0.006
      + Math.sin(globalZ * 0.29) * 0.004
    ) * elevationHump;
  }
  return 0.038;
}

function roadRoughnessAt(layoutIndex, globalZ, progress) {
  if (layoutIndex !== 9) return 0.08;
  const elevationHump = 16 * progress * progress * (1 - progress) * (1 - progress);
  const unevenness = Math.abs(Math.sin(globalZ * 0.7)) * 0.55
    + Math.abs(Math.sin(globalZ * 0.29)) * 0.25;
  return THREE.MathUtils.clamp(0.08 + unevenness * elevationHump, 0, 1);
}

function roadChunkRouteLength(seed, chunkIndex, difficulty) {
  const layoutIndex = roadLayoutIndexFor(seed, chunkIndex, difficulty);
  const chunkStartZ = chunkIndex * CHUNK_LENGTH;
  let previousZ = chunkStartZ;
  let previousCenter = chunkCenterOffset(seed, previousZ, difficulty)
    + localRoadOffset(layoutIndex, 0, difficulty);
  let previousHeight = roadHeightAt(layoutIndex, previousZ, 0);
  let routeLength = 0;
  for (let segment = 1; segment <= ROAD_SEGMENTS; segment += 1) {
    const progress = segment / ROAD_SEGMENTS;
    const worldZ = chunkStartZ + progress * CHUNK_LENGTH;
    const center = chunkCenterOffset(seed, worldZ, difficulty)
      + localRoadOffset(layoutIndex, progress, difficulty);
    const height = roadHeightAt(layoutIndex, worldZ, progress);
    routeLength += Math.hypot(
      center - previousCenter,
      height - previousHeight,
      worldZ - previousZ,
    );
    previousZ = worldZ;
    previousCenter = center;
    previousHeight = height;
  }
  return routeLength;
}

function roadChunkLocalRouteDistance(
  seed,
  chunkIndex,
  chunkProgress,
  difficulty,
) {
  const layoutIndex = roadLayoutIndexFor(seed, chunkIndex, difficulty);
  const chunkStartZ = chunkIndex * CHUNK_LENGTH;
  const scaledSegment = chunkProgress * ROAD_SEGMENTS;
  const segmentIndex = Math.min(
    ROAD_SEGMENTS - 1,
    Math.floor(scaledSegment),
  );
  const segmentProgress = scaledSegment - segmentIndex;
  let previousZ = chunkStartZ;
  let previousCenter = chunkCenterOffset(seed, previousZ, difficulty)
    + localRoadOffset(layoutIndex, 0, difficulty);
  let previousHeight = roadHeightAt(layoutIndex, previousZ, 0);
  let localDistance = 0;
  for (let segment = 1; segment <= segmentIndex + 1; segment += 1) {
    const progress = segment / ROAD_SEGMENTS;
    const worldZ = chunkStartZ + progress * CHUNK_LENGTH;
    const center = chunkCenterOffset(seed, worldZ, difficulty)
      + localRoadOffset(layoutIndex, progress, difficulty);
    const height = roadHeightAt(layoutIndex, worldZ, progress);
    const segmentLength = Math.hypot(
      center - previousCenter,
      height - previousHeight,
      worldZ - previousZ,
    );
    localDistance += segment === segmentIndex + 1
      ? segmentLength * segmentProgress
      : segmentLength;
    previousZ = worldZ;
    previousCenter = center;
    previousHeight = height;
  }
  return localDistance;
}

function configureMesh(mesh, geometry, material, x, y, z, sx, sy, sz, rotationY = 0) {
  mesh.geometry = geometry;
  mesh.material = material;
  mesh.position.set(x, y, z);
  mesh.rotation.set(0, rotationY, 0);
  mesh.scale.set(sx, sy, sz);
  mesh.visible = true;
}

function hideMeshPool(pool) {
  for (let index = 0; index < pool.length; index += 1) pool[index].visible = false;
}

function createMeshPool(count) {
  const pool = [];
  for (let index = 0; index < count; index += 1) {
    const mesh = new THREE.Mesh(geometries.box, materials.plaster);
    mesh.visible = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pool.push(mesh);
  }
  return pool;
}

function createChunk(slotIndex, obstaclePool) {
  const group = new THREE.Group();
  group.name = `ProceduralChunkPool${slotIndex}`;
  const ground = new THREE.Mesh(createStripGeometry(GROUND_SEGMENTS, true), materials.ground);
  ground.receiveShadow = true;
  const road = new THREE.Mesh(createStripGeometry(ROAD_SEGMENTS), materials.road);
  road.receiveShadow = true;
  road.renderOrder = 1;
  const tracks = makeInstanced(geometries.track, materials.roadTrack, 32);
  const treeTrunks = makeInstanced(geometries.treeTrunk, materials.trunk, MAX_TREES, true);
  const treeCrowns = makeInstanced(geometries.treeCrown, materials.leaf, MAX_TREES, true);
  const crops = makeInstanced(geometries.crop, materials.crop[0], MAX_CROPS);
  const grass = makeInstanced(geometries.grass, materials.grass, MAX_GRASS);
  const bushes = makeInstanced(geometries.bush, materials.bush, MAX_BUSHES, true);
  const rocks = makeInstanced(geometries.rock, materials.rock, MAX_ROCKS);
  const houses = makeInstanced(geometries.house, materials.plaster, MAX_HOUSES, true);
  const roofs = makeInstanced(geometries.roof, materials.roof, MAX_HOUSES, true);
  const roadsideProps = makeInstanced(
    geometries.prop,
    materials.trunk,
    MAX_ROADSIDE_PROPS,
    true,
  );
  const pots = makeInstanced(geometries.sphere, materials.clay, MAX_POTS, true);
  const woodPiles = makeInstanced(geometries.box, materials.trunk, MAX_WOOD_PILES, true);
  const signs = makeInstanced(geometries.box, materials.plasterBlue, MAX_SIGNS, true);
  const eventPeople = makeInstanced(
    geometries.person,
    materials.event,
    MAX_EVENT_PEOPLE,
    true,
  );
  const water = new THREE.Mesh(geometries.water, materials.water);
  water.rotation.x = -Math.PI / 2;
  water.visible = false;
  water.receiveShadow = true;
  const villageMeshPool = createMeshPool(12);
  const landmarkMeshPool = createMeshPool(14);

  group.add(
    ground,
    road,
    tracks,
    treeTrunks,
    treeCrowns,
    crops,
    grass,
    bushes,
    rocks,
    houses,
    roofs,
    roadsideProps,
    pots,
    woodPiles,
    signs,
    eventPeople,
    water,
  );
  for (let index = 0; index < villageMeshPool.length; index += 1) {
    group.add(villageMeshPool[index]);
  }
  for (let index = 0; index < landmarkMeshPool.length; index += 1) {
    group.add(landmarkMeshPool[index]);
  }

  const obstacleStart = slotIndex * OBSTACLES_PER_CHUNK;
  for (let index = 0; index < OBSTACLES_PER_CHUNK; index += 1) {
    obstaclePool[obstacleStart + index] = { x: 10000, z: 10000, radius: 0 };
  }

  return {
    slotIndex,
    group,
    ground,
    road,
    tracks,
    treeTrunks,
    treeCrowns,
    crops,
    grass,
    bushes,
    rocks,
    houses,
    roofs,
    roadsideProps,
    pots,
    woodPiles,
    signs,
    eventPeople,
    water,
    villageMeshPool,
    landmarkMeshPool,
    obstacleStart,
    chunkIndex: Number.NaN,
    layoutIndex: 0,
    layout: "Straight",
    themeIndex: 0,
    theme: THEME_DEFINITIONS[0].name,
    village: "None",
    landmark: "None",
    event: "None",
    regionId: "None",
    regionType: "Farming",
    regionClimate: "temperate",
    regionStartRouteDistance: 0,
    regionEndRouteDistance: 0,
    lodLevel: 2,
    roadWidth: 15,
    roadCenter: 0,
    objectCount: 0,
    fullTreeCount: 0,
    fullCropCount: 0,
    fullGrassCount: 0,
    fullBushCount: 0,
    fullRockCount: 0,
    fullHouseCount: 0,
    fullPropCount: 0,
    fullPotCount: 0,
    fullWoodPileCount: 0,
    fullSignCount: 0,
    fullEventCount: 0,
  };
}

export class RoadGenerator {
  constructor(seed) {
    this.seed = seed;
    this.scratch = new THREE.Object3D();
    this.hazardRouteSample = {};
    this.eventRouteSample = {};
    this.previousEventRouteSample = {};
    this.regionSample = {};
  }

  configure(chunk, chunkIndex, difficulty) {
    const layoutIndex = roadLayoutIndexFor(this.seed, chunkIndex, difficulty);
    const startZ = chunkIndex * CHUNK_LENGTH;
    const roadPositions = chunk.road.geometry.attributes.position.array;
    const trackSpacing = 5.6;
    const trackCount = Math.min(32, Math.floor(CHUNK_LENGTH / trackSpacing) * 2);
    let trackIndex = 0;

    for (let segment = 0; segment <= ROAD_SEGMENTS; segment += 1) {
      const progress = segment / ROAD_SEGMENTS;
      const globalZ = startZ + progress * CHUNK_LENGTH;
      const center =
        chunkCenterOffset(this.seed, globalZ, difficulty)
        + localRoadOffset(layoutIndex, progress, difficulty);
      const width = roadWidthAt(
        this.seed,
        chunkIndex,
        layoutIndex,
        progress,
        difficulty,
      );
      const height = roadHeightAt(layoutIndex, globalZ, progress);
      const offset = segment * 6;
      roadPositions[offset] = center - width * 0.5;
      roadPositions[offset + 1] = height;
      roadPositions[offset + 2] = globalZ;
      roadPositions[offset + 3] = center + width * 0.5;
      roadPositions[offset + 4] = height;
      roadPositions[offset + 5] = globalZ;
    }

    for (let z = startZ + 2.8; z < startZ + CHUNK_LENGTH - 2; z += trackSpacing) {
      const progress = (z - startZ) / CHUNK_LENGTH;
      const center =
        chunkCenterOffset(this.seed, z, difficulty)
        + localRoadOffset(layoutIndex, progress, difficulty);
      const width = THREE.MathUtils.lerp(
        boundaryRoadWidth(this.seed, chunkIndex, difficulty),
        boundaryRoadWidth(this.seed, chunkIndex + 1, difficulty),
        smoothstep(progress),
      );
      for (let side = -1; side <= 1; side += 2) {
        setTransform(
          this.scratch,
          center + side * width * 0.22,
          0.054,
          z,
          0,
          1,
          1,
          1,
        );
        chunk.tracks.setMatrixAt(trackIndex, this.scratch.matrix);
        trackIndex += 1;
      }
    }

    chunk.layoutIndex = layoutIndex;
    chunk.layout = ROAD_LAYOUTS[layoutIndex];
    chunk.roadCenter =
      chunkCenterOffset(this.seed, startZ + CHUNK_LENGTH * 0.5, difficulty)
      + localRoadOffset(layoutIndex, 0.5, difficulty);
    chunk.roadWidth =
      (
        boundaryRoadWidth(this.seed, chunkIndex, difficulty)
        + boundaryRoadWidth(this.seed, chunkIndex + 1, difficulty)
      ) * 0.5
      + (layoutIndex === 5 ? -2.6 : layoutIndex === 6 ? 3.1 : 0);
    finalizeInstances(chunk.tracks, Math.min(trackIndex, trackCount));
    prepareDynamicGeometry(chunk.road);
  }

  sampleRoadCenter(chunkIndex, worldZ, difficulty) {
    const progress = THREE.MathUtils.clamp(
      (worldZ - chunkIndex * CHUNK_LENGTH) / CHUNK_LENGTH,
      0,
      1,
    );
    const layoutIndex = roadLayoutIndexFor(this.seed, chunkIndex, difficulty);
    return (
      chunkCenterOffset(this.seed, worldZ, difficulty)
      + localRoadOffset(layoutIndex, progress, difficulty)
    );
  }

  sampleRoad(worldPosition, difficulty = 1, target = {}) {
    const worldZ = worldPosition.z;
    const chunkIndex = Math.floor(worldZ / CHUNK_LENGTH);
    const chunkStartZ = chunkIndex * CHUNK_LENGTH;
    const chunkProgress = (worldZ - chunkStartZ) / CHUNK_LENGTH;
    const scaledSegment = chunkProgress * ROAD_SEGMENTS;
    const segmentIndex = Math.min(ROAD_SEGMENTS - 1, Math.floor(scaledSegment));
    const segmentProgress = scaledSegment - segmentIndex;
    const startProgress = segmentIndex / ROAD_SEGMENTS;
    const endProgress = (segmentIndex + 1) / ROAD_SEGMENTS;
    const startZ = chunkStartZ + startProgress * CHUNK_LENGTH;
    const endZ = chunkStartZ + endProgress * CHUNK_LENGTH;
    const layoutIndex = roadLayoutIndexFor(this.seed, chunkIndex, difficulty);
    const startCenter = chunkCenterOffset(this.seed, startZ, difficulty)
      + localRoadOffset(layoutIndex, startProgress, difficulty);
    const endCenter = chunkCenterOffset(this.seed, endZ, difficulty)
      + localRoadOffset(layoutIndex, endProgress, difficulty);
    const startHeight = roadHeightAt(layoutIndex, startZ, startProgress);
    const endHeight = roadHeightAt(layoutIndex, endZ, endProgress);
    const centerX = THREE.MathUtils.lerp(startCenter, endCenter, segmentProgress);
    const width = THREE.MathUtils.lerp(
      roadWidthAt(this.seed, chunkIndex, layoutIndex, startProgress, difficulty),
      roadWidthAt(this.seed, chunkIndex, layoutIndex, endProgress, difficulty),
      segmentProgress,
    );
    const height = THREE.MathUtils.lerp(startHeight, endHeight, segmentProgress);
    const tangentDeltaX = endCenter - startCenter;
    const tangentDeltaZ = endZ - startZ;
    const tangentLength = Math.hypot(tangentDeltaX, tangentDeltaZ);
    const signedOffset = worldPosition.x - centerX;
    const distanceFromCenter = Math.abs(signedOffset);
    const themeIndex = themeIndexFor(this.seed, chunkIndex);

    target.chunkIndex = chunkIndex;
    target.centerX = centerX;
    target.width = width;
    target.height = height;
    target.tangentX = tangentDeltaX / tangentLength;
    target.tangentZ = tangentDeltaZ / tangentLength;
    target.slope = (endHeight - startHeight) / tangentLength;
    target.roughness = roadRoughnessAt(layoutIndex, worldZ, chunkProgress);
    target.normalizedOffset = signedOffset / (width * 0.5);
    target.distanceFromCenter = distanceFromCenter;
    target.isOnRoad = distanceFromCenter <= width * 0.5;
    target.theme = THEME_DEFINITIONS[themeIndex].name;
    generateRegionDescriptor(this.seed, worldZ, this.regionSample);
    target.regionId = this.regionSample.id;
    target.regionType = this.regionSample.type;
    target.layout = ROAD_LAYOUTS[layoutIndex];
    target.surfaceType = surfaceTypeAt(
      themeIndex,
      distanceFromCenter,
      width,
    );
    target.edgeSurfaceType = edgeSurfaceTypeFor(themeIndex);
    target.offRoadSurfaceType = offRoadSurfaceTypeFor(themeIndex);
    target.farOffRoadSurfaceType = farOffRoadSurfaceTypeFor(themeIndex);
    return target;
  }

  getRoutePosition(worldPosition, difficulty = 1, target = {}) {
    this.sampleRoad(worldPosition, difficulty, target);
    const worldZ = worldPosition.z;
    const chunkIndex = target.chunkIndex;
    const chunkProgress = (
      worldZ - chunkIndex * CHUNK_LENGTH
    ) / CHUNK_LENGTH;
    const localDistance = roadChunkLocalRouteDistance(
      this.seed,
      chunkIndex,
      chunkProgress,
      difficulty,
    );
    let routeDistance = 0;
    if (chunkIndex >= 0) {
      for (let index = 0; index < chunkIndex; index += 1) {
        routeDistance += roadChunkRouteLength(this.seed, index, difficulty);
      }
    } else {
      for (let index = chunkIndex; index < 0; index += 1) {
        routeDistance -= roadChunkRouteLength(this.seed, index, difficulty);
      }
    }
    target.localDistance = localDistance;
    target.routeDistance = routeDistance + localDistance;
    generateRegionDescriptor(
      this.seed,
      target.routeDistance,
      this.regionSample,
    );
    target.regionId = this.regionSample.id;
    target.regionType = this.regionSample.type;
    target.roadCenterX = target.centerX;
    target.roadHeight = target.height;
    return target;
  }

  sampleRouteDistance(routeDistance, difficulty = 1, target = {}) {
    let chunkIndex = 0;
    let localDistance = routeDistance;
    let chunkLength = 0;
    if (routeDistance >= 0) {
      while (true) {
        chunkLength = roadChunkRouteLength(
          this.seed,
          chunkIndex,
          difficulty,
        );
        if (localDistance < chunkLength) break;
        localDistance -= chunkLength;
        chunkIndex += 1;
      }
    } else {
      chunkIndex = -1;
      let distanceFromOrigin = -routeDistance;
      while (true) {
        chunkLength = roadChunkRouteLength(
          this.seed,
          chunkIndex,
          difficulty,
        );
        if (distanceFromOrigin <= chunkLength) {
          localDistance = chunkLength - distanceFromOrigin;
          break;
        }
        distanceFromOrigin -= chunkLength;
        chunkIndex -= 1;
      }
    }

    const layoutIndex = roadLayoutIndexFor(
      this.seed,
      chunkIndex,
      difficulty,
    );
    const chunkStartZ = chunkIndex * CHUNK_LENGTH;
    let previousProgress = 0;
    let previousZ = chunkStartZ;
    let previousCenter = chunkCenterOffset(
      this.seed,
      previousZ,
      difficulty,
    ) + localRoadOffset(layoutIndex, 0, difficulty);
    let previousHeight = roadHeightAt(layoutIndex, previousZ, 0);
    let accumulatedDistance = 0;
    let centerX = previousCenter;
    let centerY = previousHeight;
    let centerZ = previousZ;
    let tangentX = 0;
    let tangentZ = 1;
    let width = roadWidthAt(
      this.seed,
      chunkIndex,
      layoutIndex,
      0,
      difficulty,
    );
    let slope = 0;

    for (let segment = 1; segment <= ROAD_SEGMENTS; segment += 1) {
      const progress = segment / ROAD_SEGMENTS;
      const worldZ = chunkStartZ + progress * CHUNK_LENGTH;
      const center = chunkCenterOffset(this.seed, worldZ, difficulty)
        + localRoadOffset(layoutIndex, progress, difficulty);
      const height = roadHeightAt(layoutIndex, worldZ, progress);
      const deltaX = center - previousCenter;
      const deltaY = height - previousHeight;
      const deltaZ = worldZ - previousZ;
      const segmentLength = Math.hypot(deltaX, deltaY, deltaZ);
      if (
        localDistance <= accumulatedDistance + segmentLength
        || segment === ROAD_SEGMENTS
      ) {
        const segmentProgress = THREE.MathUtils.clamp(
          (localDistance - accumulatedDistance) / segmentLength,
          0,
          1,
        );
        const horizontalLength = Math.hypot(deltaX, deltaZ);
        centerX = THREE.MathUtils.lerp(
          previousCenter,
          center,
          segmentProgress,
        );
        centerY = THREE.MathUtils.lerp(
          previousHeight,
          height,
          segmentProgress,
        );
        centerZ = THREE.MathUtils.lerp(previousZ, worldZ, segmentProgress);
        tangentX = deltaX / horizontalLength;
        tangentZ = deltaZ / horizontalLength;
        width = THREE.MathUtils.lerp(
          roadWidthAt(
            this.seed,
            chunkIndex,
            layoutIndex,
            previousProgress,
            difficulty,
          ),
          roadWidthAt(
            this.seed,
            chunkIndex,
            layoutIndex,
            progress,
            difficulty,
          ),
          segmentProgress,
        );
        slope = deltaY / horizontalLength;
        break;
      }
      accumulatedDistance += segmentLength;
      previousProgress = progress;
      previousZ = worldZ;
      previousCenter = center;
      previousHeight = height;
    }

    target.chunkIndex = chunkIndex;
    target.localDistance = localDistance;
    target.routeDistance = routeDistance;
    target.centerX = centerX;
    target.centerY = centerY;
    target.centerZ = centerZ;
    target.tangentX = tangentX;
    target.tangentZ = tangentZ;
    target.normalX = tangentZ;
    target.normalZ = -tangentX;
    target.width = width;
    target.slope = slope;
    target.theme = THEME_DEFINITIONS[
      themeIndexFor(this.seed, chunkIndex)
    ].name;
    generateRegionDescriptor(this.seed, routeDistance, this.regionSample);
    target.regionId = this.regionSample.id;
    target.regionType = this.regionSample.type;
    target.layout = ROAD_LAYOUTS[layoutIndex];
    return target;
  }

  generateHazardDescriptors(
    startRouteDistance,
    targetRouteDistance,
    difficulty = 1,
    checkpointStates,
    targetHazards,
  ) {
    const level = Math.max(1, Math.floor(difficulty));
    const isEasy = level <= 1;
    const isHard = level >= 3;
    const minimumSpacing = isEasy ? 40 : isHard ? 21 : 28;
    const spacingJitter = isEasy ? 12 : isHard ? 7 : 9;
    const maximumCount = Math.min(
      targetHazards.length,
      isEasy ? 10 : isHard ? 22 : 15,
      MAX_ROUTE_HAZARDS,
    );
    const finalRouteDistance = (
      targetRouteDistance - HAZARD_DESTINATION_CLEARANCE
    );
    let candidateIndex = 0;
    let hazardCount = 0;
    let routeDistance = startRouteDistance + HAZARD_START_CLEARANCE;

    while (
      routeDistance < finalRouteDistance
      && hazardCount < maximumCount
      && candidateIndex < MAX_ROUTE_HAZARDS * 4
    ) {
      const spacingHash = hash01(
        this.seed,
        candidateIndex + level * 101,
        701,
      );
      routeDistance += spacingHash * spacingJitter;

      let checkpointClear = true;
      for (
        let checkpointIndex = 0;
        checkpointIndex < checkpointStates.length;
        checkpointIndex += 1
      ) {
        if (
          Math.abs(
            checkpointStates[checkpointIndex].routeDistance - routeDistance,
          ) < HAZARD_CHECKPOINT_CLEARANCE
        ) {
          checkpointClear = false;
          break;
        }
      }

      if (checkpointClear && routeDistance < finalRouteDistance) {
        const descriptor = targetHazards[hazardCount];
        const sample = this.sampleRouteDistance(
          routeDistance,
          level,
          this.hazardRouteSample,
        );
        const laneHash = hash01(
          this.seed,
          candidateIndex + level * 131,
          709,
        );
        let normalizedLane = 0;
        if (isEasy) {
          normalizedLane = laneHash < 0.34
            ? -0.32
            : laneHash < 0.67 ? 0 : 0.32;
        } else if (isHard) {
          if (laneHash < 0.14) normalizedLane = -0.78;
          else if (laneHash < 0.28) normalizedLane = -0.5;
          else if (laneHash < 0.42) normalizedLane = -0.24;
          else if (laneHash < 0.58) normalizedLane = 0;
          else if (laneHash < 0.72) normalizedLane = 0.24;
          else if (laneHash < 0.86) normalizedLane = 0.5;
          else normalizedLane = 0.78;
        } else if (laneHash < 0.18) normalizedLane = -0.55;
        else if (laneHash < 0.36) normalizedLane = -0.28;
        else if (laneHash < 0.64) normalizedLane = 0;
        else if (laneHash < 0.82) normalizedLane = 0.28;
        else normalizedLane = 0.55;

        const typeHash = hash01(
          this.seed,
          candidateIndex + level * 173,
          719,
        );
        let type;
        if (sample.regionType === "Forest") {
          type = typeHash < 0.66
            ? HAZARD_FALLEN_BRANCH
            : typeHash < 0.9 ? HAZARD_WOODEN_LOG : HAZARD_ROCK;
        } else if (sample.regionType === "Rocky Area") {
          type = typeHash < 0.72 ? HAZARD_ROCK : HAZARD_POTHOLE;
        } else if (sample.regionType === "Farming") {
          type = typeHash < 0.64
            ? HAZARD_HAY_BUNDLE
            : HAZARD_BROKEN_CART_WHEEL;
        } else if (sample.regionType === "Riverside") {
          type = typeHash < 0.72 ? HAZARD_POTHOLE : HAZARD_ROCK;
        } else if (
          sample.layout === "Slight Uphill"
          || sample.layout === "Slight Downhill"
          || sample.layout === "Uneven Road"
        ) {
          type = typeHash < 0.52 ? HAZARD_ROCK : HAZARD_POTHOLE;
        } else if (
          sample.theme === "Village Outskirts"
          || sample.theme === "Village Centre"
        ) {
          type = typeHash < 0.5
            ? HAZARD_BROKEN_CART_WHEEL
            : HAZARD_HAY_BUNDLE;
        } else if (
          sample.layout === "Gentle Left Curve"
          || sample.layout === "Gentle Right Curve"
          || sample.layout === "S-Curve"
        ) {
          type = typeHash < 0.5
            ? HAZARD_FALLEN_BRANCH
            : HAZARD_WOODEN_LOG;
        } else {
          const typeIndex = Math.min(5, Math.floor(typeHash * 6));
          if (typeIndex === 0) type = HAZARD_ROCK;
          else if (typeIndex === 1) type = HAZARD_FALLEN_BRANCH;
          else if (typeIndex === 2) type = HAZARD_WOODEN_LOG;
          else if (typeIndex === 3) type = HAZARD_POTHOLE;
          else if (typeIndex === 4) type = HAZARD_BROKEN_CART_WHEEL;
          else type = HAZARD_HAY_BUNDLE;
        }

        const sizeHash = hash01(
          this.seed,
          candidateIndex + level * 199,
          727,
        );
        const minimumSize = isEasy ? 0.78 : isHard ? 1 : 0.9;
        const sizeRange = isEasy ? 0.18 : isHard ? 0.2 : 0.18;
        const absoluteLane = Math.abs(normalizedLane);

        descriptor.id = hashUint(
          this.seed,
          candidateIndex + level * 211,
          733,
        );
        descriptor.routeDistance = routeDistance;
        descriptor.laneOffset = normalizedLane * sample.width * 0.5;
        descriptor.lane = absoluteLane < 0.12
          ? "centre"
          : absoluteLane >= 0.68
            ? normalizedLane < 0 ? "edge-left" : "edge-right"
            : normalizedLane < 0 ? "left" : "right";
        descriptor.type = type;
        descriptor.size = minimumSize + sizeHash * sizeRange;
        descriptor.difficulty = level;
        descriptor.chunkIndex = sample.chunkIndex;
        descriptor.theme = sample.theme;
        descriptor.regionId = sample.regionId;
        descriptor.regionType = sample.regionType;
        descriptor.regionVariant = sample.regionType === "Forest"
          ? "fallen-wood"
          : sample.regionType === "Rocky Area"
            ? "stone"
            : sample.regionType === "Farming"
              ? "hay"
              : sample.regionType === "Riverside"
                ? "muddy-patch"
                : "dry-road";
        descriptor.active = true;
        hazardCount += 1;
      }

      routeDistance += minimumSpacing;
      candidateIndex += 1;
    }

    for (let index = hazardCount; index < targetHazards.length; index += 1) {
      targetHazards[index].active = false;
    }
    return hazardCount;
  }

  generateEventDescriptors(
    startRouteDistance,
    targetRouteDistance,
    difficulty = 1,
    missionKey = 0,
    checkpointStates,
    hazardDescriptors,
    targetEvents,
  ) {
    const level = Math.max(1, Math.floor(difficulty));
    const missionSalt = Math.max(0, Math.floor(missionKey));
    const isEasy = level <= 1;
    const isHard = level >= 3;
    const minimumSpacing = isEasy ? 112 : isHard ? 40 : 84;
    const spacingJitter = isEasy ? 14 : isHard ? 12 : 16;
    const maximumCount = Math.min(
      targetEvents.length,
      isEasy ? 2 : isHard ? 6 : 3,
      MAX_ROUTE_EVENTS,
    );
    const finalRouteDistance = (
      targetRouteDistance - EVENT_DESTINATION_CLEARANCE
    );
    let candidateIndex = 0;
    let eventCount = 0;
    let routeDistance = startRouteDistance + EVENT_START_CLEARANCE;

    while (
      routeDistance < finalRouteDistance
      && eventCount < maximumCount
      && candidateIndex < MAX_ROUTE_EVENTS * 12
    ) {
      const deterministicIndex = (
        candidateIndex + level * 149 + missionSalt * 977
      );
      routeDistance += hash01(
        this.seed,
        deterministicIndex,
        811,
      ) * spacingJitter;

      const sample = this.sampleRouteDistance(
        routeDistance,
        level,
        this.eventRouteSample,
      );
      this.sampleRouteDistance(
        routeDistance - 22,
        level,
        this.previousEventRouteSample,
      );
      const typeHash = hash01(
        this.seed,
        deterministicIndex,
        823,
      );
      let type;
      let activity;
      if (sample.regionType === "Forest") {
        type = typeHash < 0.7 ? EVENT_ROAD_REPAIR : EVENT_BROKEN_BULLOCK_CART;
        activity = "Woodcutters";
      } else if (sample.regionType === "Riverside") {
        type = typeHash < 0.7 ? EVENT_WATER_PUDDLE : EVENT_VILLAGE_CROWD;
        activity = "Fishermen";
      } else if (sample.regionType === "Farming") {
        type = typeHash < 0.55 ? EVENT_VILLAGE_CROWD : EVENT_MARKET_SPILL;
        activity = "Harvest Activity";
      } else if (sample.regionType === "Rocky Area") {
        type = typeHash < 0.6 ? EVENT_ROAD_REPAIR : EVENT_BROKEN_BULLOCK_CART;
        activity = "Stone Workers";
      } else if (sample.regionType === "Dry Plains") {
        type = typeHash < 0.55 ? EVENT_CATTLE_CROSSING : EVENT_BROKEN_BULLOCK_CART;
        activity = "Herders";
      } else if (
        sample.theme === "Village Outskirts"
        || sample.theme === "Village Centre"
      ) {
        if (typeHash < 0.34) type = EVENT_VILLAGE_CROWD;
        else if (typeHash < 0.67) type = EVENT_MARKET_SPILL;
        else type = EVENT_BROKEN_BULLOCK_CART;
      } else if (sample.layout === "Fork-Ready Section") {
        type = typeHash < 0.55
          ? EVENT_ROAD_REPAIR
          : EVENT_CATTLE_CROSSING;
      } else if (
        sample.layout === "Slight Uphill"
        || sample.layout === "Slight Downhill"
        || sample.layout === "Uneven Road"
        || this.previousEventRouteSample.layout === "Slight Uphill"
        || this.previousEventRouteSample.layout === "Slight Downhill"
      ) {
        type = typeHash < 0.45
          ? EVENT_WATER_PUDDLE
          : EVENT_BROKEN_BULLOCK_CART;
      } else {
        const typeIndex = Math.min(5, Math.floor(typeHash * 6));
        if (typeIndex === 0) type = EVENT_BROKEN_BULLOCK_CART;
        else if (typeIndex === 1) type = EVENT_CATTLE_CROSSING;
        else if (typeIndex === 2) type = EVENT_VILLAGE_CROWD;
        else if (typeIndex === 3) type = EVENT_ROAD_REPAIR;
        else if (typeIndex === 4) type = EVENT_MARKET_SPILL;
        else type = EVENT_WATER_PUDDLE;
      }

      let length = 7;
      if (type === EVENT_CATTLE_CROSSING) length = 9;
      else if (type === EVENT_VILLAGE_CROWD) length = 10;
      else if (type === EVENT_ROAD_REPAIR) length = 12;
      else if (type === EVENT_MARKET_SPILL) length = 8;
      else if (type === EVENT_WATER_PUDDLE) length = 6;

      let placementClear = routeDistance < finalRouteDistance;
      for (
        let checkpointIndex = 0;
        placementClear && checkpointIndex < checkpointStates.length;
        checkpointIndex += 1
      ) {
        placementClear = Math.abs(
          checkpointStates[checkpointIndex].routeDistance - routeDistance,
        ) >= EVENT_CHECKPOINT_CLEARANCE + length * 0.5;
      }
      for (
        let hazardIndex = 0;
        placementClear && hazardIndex < hazardDescriptors.length;
        hazardIndex += 1
      ) {
        const hazard = hazardDescriptors[hazardIndex];
        if (!hazard.active) continue;
        placementClear = Math.abs(
          hazard.routeDistance - routeDistance,
        ) >= (
          length * 0.5
          + (isHard ? 1.25 : EVENT_HAZARD_CLEARANCE)
        );
      }
      for (
        let previousIndex = 0;
        placementClear && previousIndex < eventCount;
        previousIndex += 1
      ) {
        const previousEvent = targetEvents[previousIndex];
        placementClear = Math.abs(
          previousEvent.routeDistance - routeDistance,
        ) >= (
          minimumSpacing
          + (previousEvent.length + length) * 0.5
        );
      }

      if (placementClear) {
        const descriptor = targetEvents[eventCount];
        const laneHash = hash01(
          this.seed,
          deterministicIndex,
          829,
        );
        let normalizedLane = laneHash < 0.5 ? -0.42 : 0.42;
        if (type === EVENT_CATTLE_CROSSING) normalizedLane = 0;
        else if (type === EVENT_ROAD_REPAIR) {
          normalizedLane = laneHash < 0.5 ? -0.28 : 0.28;
        } else if (type === EVENT_WATER_PUDDLE) {
          normalizedLane = (laneHash - 0.5) * 0.8;
        }

        descriptor.id = hashUint(
          this.seed,
          deterministicIndex,
          839,
        );
        descriptor.type = type;
        descriptor.routeDistance = routeDistance;
        descriptor.laneOffset = normalizedLane * sample.width * 0.5;
        descriptor.length = length;
        descriptor.difficulty = level;
        descriptor.chunkIndex = sample.chunkIndex;
        descriptor.theme = sample.theme;
        descriptor.regionId = sample.regionId;
        descriptor.regionType = sample.regionType;
        descriptor.activity = activity || "Roadside Activity";
        descriptor.active = true;
        eventCount += 1;
      }

      routeDistance += placementClear ? minimumSpacing : 11;
      candidateIndex += 1;
    }

    for (let index = eventCount; index < targetEvents.length; index += 1) {
      targetEvents[index].active = false;
    }
    return eventCount;
  }

  generateRouteNetwork(
    startRouteDistance,
    targetRouteDistance,
    difficulty = 1,
    missionKey = 0,
    destinationVillageName,
    targetJunctions,
    targetMissionRoute,
  ) {
    const level = Math.max(1, Math.floor(difficulty));
    const missionSalt = Math.max(0, Math.floor(missionKey));
    const junctionCount = Math.min(
      targetJunctions.length,
      level <= 1 ? 2 : MAX_ROUTE_JUNCTIONS,
    );
    const startRouteId = `route-${missionSalt}-start`;
    let incomingRouteId = startRouteId;

    targetMissionRoute.destinationVillageName = destinationVillageName;
    targetMissionRoute.startRouteId = startRouteId;
    for (
      let index = 0;
      index < targetMissionRoute.correctRouteIds.length;
      index += 1
    ) {
      targetMissionRoute.correctRouteIds[index] = null;
    }
    targetMissionRoute.correctRouteIds[0] = startRouteId;
    targetMissionRoute.junctionCount = junctionCount;

    for (let index = 0; index < junctionCount; index += 1) {
      const descriptor = targetJunctions[index];
      const deterministicIndex = missionSalt * 211 + index * 37 + level * 101;
      const junctionHash = hashUint(this.seed, deterministicIndex, 907);
      const typeIndex = junctionHash % 4;
      const type = typeIndex === 0
        ? JUNCTION_LEFT_RIGHT
        : typeIndex === 1
          ? JUNCTION_STRAIGHT_LEFT
          : typeIndex === 2
            ? JUNCTION_STRAIGHT_RIGHT
            : JUNCTION_THREE_WAY;
      const routeDistance = junctionCount === 2
        ? targetRouteDistance - (index === 0 ? 365 : 165)
        : targetRouteDistance - (
          index === 0 ? 365 : index === 1 ? 265 : 165
        );
      const id = `junction-${missionSalt}-${index}`;

      descriptor.id = id;
      descriptor.type = type;
      descriptor.routeDistance = routeDistance;
      descriptor.incomingRouteId = incomingRouteId;
      descriptor.destinationVillageName = destinationVillageName;
      descriptor.villagerSpawnRouteDistance = routeDistance - 5;
      descriptor.wrongVillagerSpawnRouteDistance = routeDistance + 22;
      descriptor.outgoingRoutes.length = 0;

      if (
        type === JUNCTION_STRAIGHT_LEFT
        || type === JUNCTION_STRAIGHT_RIGHT
        || type === JUNCTION_THREE_WAY
      ) {
        descriptor.outgoingRoutes.push({
          id: `${id}-straight`,
          direction: "STRAIGHT",
        });
      }
      if (
        type === JUNCTION_LEFT_RIGHT
        || type === JUNCTION_STRAIGHT_LEFT
        || type === JUNCTION_THREE_WAY
      ) {
        descriptor.outgoingRoutes.push({
          id: `${id}-left`,
          direction: "LEFT",
        });
      }
      if (
        type === JUNCTION_LEFT_RIGHT
        || type === JUNCTION_STRAIGHT_RIGHT
        || type === JUNCTION_THREE_WAY
      ) {
        descriptor.outgoingRoutes.push({
          id: `${id}-right`,
          direction: "RIGHT",
        });
      }

      const correctIndex = hashUint(
        this.seed,
        deterministicIndex,
        919,
      ) % descriptor.outgoingRoutes.length;
      const correctRoute = descriptor.outgoingRoutes[correctIndex];
      descriptor.correctOutgoingRouteId = correctRoute.id;
      descriptor.correctDirection = correctRoute.direction;
      descriptor.chunkIndex = Math.floor(routeDistance / CHUNK_LENGTH);
      descriptor.active = true;
      targetMissionRoute.correctRouteIds[index + 1] = correctRoute.id;
      incomingRouteId = correctRoute.id;
    }

    for (
      let index = junctionCount;
      index < targetJunctions.length;
      index += 1
    ) {
      targetJunctions[index].active = false;
    }
    targetMissionRoute.destinationRouteId = incomingRouteId;
    return junctionCount;
  }
}

export class EnvironmentGenerator {
  constructor(seed, obstaclePool) {
    this.seed = seed;
    this.obstaclePool = obstaclePool;
    this.scratch = new THREE.Object3D();
  }

  fillGround(chunk, chunkIndex) {
    const startZ = chunkIndex * CHUNK_LENGTH;
    const previousTheme = THEME_DEFINITIONS[themeIndexFor(this.seed, chunkIndex - 1)];
    const currentTheme = THEME_DEFINITIONS[themeIndexFor(this.seed, chunkIndex)];
    const nextTheme = THEME_DEFINITIONS[themeIndexFor(this.seed, chunkIndex + 1)];
    const positions = chunk.ground.geometry.attributes.position.array;
    const colors = chunk.ground.geometry.attributes.color.array;
    for (let segment = 0; segment <= GROUND_SEGMENTS; segment += 1) {
      const progress = segment / GROUND_SEGMENTS;
      const offset = segment * 6;
      positions[offset] = -WORLD_HALF_WIDTH;
      positions[offset + 1] = 0;
      positions[offset + 2] = startZ + progress * CHUNK_LENGTH;
      positions[offset + 3] = WORLD_HALF_WIDTH;
      positions[offset + 4] = 0;
      positions[offset + 5] = startZ + progress * CHUNK_LENGTH;
      if (progress < 0.5) {
        sharedColorA.setHex(previousTheme.color);
        sharedColorB.setHex(currentTheme.color);
        sharedColorA.lerp(sharedColorB, smoothstep(progress * 2) * 0.5 + 0.5);
      } else {
        sharedColorA.setHex(currentTheme.color);
        sharedColorB.setHex(nextTheme.color);
        sharedColorA.lerp(sharedColorB, smoothstep((progress - 0.5) * 2) * 0.5);
      }
      colors[offset] = sharedColorA.r;
      colors[offset + 1] = sharedColorA.g;
      colors[offset + 2] = sharedColorA.b;
      colors[offset + 3] = sharedColorA.r;
      colors[offset + 4] = sharedColorA.g;
      colors[offset + 5] = sharedColorA.b;
    }
    prepareDynamicGeometry(chunk.ground);
  }

  configureTrees(chunk, chunkIndex, theme, regionDefinition) {
    const count = Math.min(
      MAX_TREES,
      Math.max(1, Math.round(theme.trees * regionDefinition.treeFactor)),
    );
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x =
        side * (16 + hash01(this.seed, chunkIndex, 200 + index) * 74);
      const z =
        chunkIndex * CHUNK_LENGTH
        + 4
        + hash01(this.seed, chunkIndex, 260 + index) * (CHUNK_LENGTH - 8);
      const scale = 0.72 + hash01(this.seed, chunkIndex, 320 + index) * 0.85;
      setTransform(this.scratch, x, 1.6 * scale, z, 0, scale, scale, scale);
      chunk.treeTrunks.setMatrixAt(index, this.scratch.matrix);
      setTransform(
        this.scratch,
        x,
        4.1 * scale,
        z,
        hash01(this.seed, chunkIndex, 380 + index) * Math.PI,
        scale,
        scale,
        scale,
      );
      chunk.treeCrowns.setMatrixAt(index, this.scratch.matrix);
      if (index < OBSTACLES_PER_CHUNK && Math.abs(x) < 29) {
        const obstacle = this.obstaclePool[chunk.obstacleStart + index];
        obstacle.x = x;
        obstacle.z = z;
        obstacle.radius = 1.25 * scale;
      }
    }
    chunk.treeCrowns.material = theme.name === "Small Forest" ? materials.leaf : materials.leafLight;
    chunk.fullTreeCount = count;
    finalizeInstances(chunk.treeTrunks, count);
    finalizeInstances(chunk.treeCrowns, count);
  }

  configureCrops(chunk, chunkIndex, themeIndex, theme, regionDefinition) {
    const count = Math.min(
      MAX_CROPS,
      Math.max(0, Math.round(theme.crops * regionDefinition.cropFactor)),
    );
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 ? 1 : -1;
      const lane = Math.floor(index / 2) % 9;
      const row = Math.floor(index / 18);
      const x =
        side * (18 + lane * 2.15 + hash01(this.seed, chunkIndex, 430 + index) * 0.5);
      const z =
        chunkIndex * CHUNK_LENGTH
        + 5
        + row * 8.4
        + hash01(this.seed, chunkIndex, 500 + index) * 1.2;
      const scale = 0.78 + hash01(this.seed, chunkIndex, 570 + index) * 0.42;
      setTransform(this.scratch, x, 0.38 * scale, z, 0, scale, scale, scale);
      chunk.crops.setMatrixAt(index, this.scratch.matrix);
    }
    chunk.crops.material = materials.crop[themeIndex];
    chunk.fullCropCount = count;
    finalizeInstances(chunk.crops, count);
  }

  configureRoadside(chunk, chunkIndex, difficulty, regionType, regionDefinition) {
    const grassFactor = regionType === "Dry Plains" ? 0.42 : regionType === "Rocky Area" ? 0.55 : 1;
    const grassCount = Math.min(
      MAX_GRASS,
      Math.round((48 + (hashUint(this.seed, chunkIndex, 620) % 25)) * grassFactor),
    );
    const bushCount = Math.min(
      MAX_BUSHES,
      Math.round((12 + (hashUint(this.seed, chunkIndex, 621) % 12)) * regionDefinition.bushFactor),
    );
    const rockCount = Math.min(
      MAX_ROCKS,
      Math.round((8 + (hashUint(this.seed, chunkIndex, 622) % 10)) * regionDefinition.rockFactor),
    );
    const propCount = Math.min(
      MAX_ROADSIDE_PROPS,
      8 + (hashUint(this.seed, chunkIndex, 623) % 14)
        + (regionType === "Farming" ? 3 : 0),
    );
    const potCount = Math.min(
      MAX_POTS,
      2 + (hashUint(this.seed, chunkIndex, 624) % 5)
        + (regionType === "Riverside" ? 2 : 0),
    );
    const woodPileCount = Math.min(
      MAX_WOOD_PILES,
      2 + (hashUint(this.seed, chunkIndex, 625) % 5)
        + (regionType === "Forest" ? 2 : 0),
    );
    const signCount = 1 + (hashUint(this.seed, chunkIndex, 626) % 3);
    const startZ = chunkIndex * CHUNK_LENGTH;

    for (let index = 0; index < grassCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (9.5 + hash01(this.seed, chunkIndex, 700 + index) * 11);
      const z = startZ + hash01(this.seed, chunkIndex, 780 + index) * CHUNK_LENGTH;
      const scale = 0.65 + hash01(this.seed, chunkIndex, 860 + index) * 0.8;
      setTransform(this.scratch, x, 0.3 * scale, z, 0, scale, scale, scale);
      chunk.grass.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < bushCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (11 + hash01(this.seed, chunkIndex, 940 + index) * 16);
      const z = startZ + hash01(this.seed, chunkIndex, 1000 + index) * CHUNK_LENGTH;
      const scale = 0.6 + hash01(this.seed, chunkIndex, 1060 + index) * 0.7;
      setTransform(this.scratch, x, 0.45 * scale, z, 0, scale, scale, scale);
      chunk.bushes.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < rockCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const safeMargin = 10.5 - Math.min(1.5, difficulty * 0.12);
      const rockyCliff = regionType === "Rocky Area" && index < 5;
      const x = rockyCliff
        ? side * (24 + hash01(this.seed, chunkIndex, 1120 + index) * 12)
        : side * (safeMargin + hash01(this.seed, chunkIndex, 1120 + index) * 16);
      const z = startZ + hash01(this.seed, chunkIndex, 1180 + index) * CHUNK_LENGTH;
      const scale = (
        0.5 + hash01(this.seed, chunkIndex, 1240 + index) * 0.9
      ) * (rockyCliff ? 2.7 : 1);
      setTransform(
        this.scratch,
        x,
        0.24 * scale,
        z,
        hash01(this.seed, chunkIndex, 1300 + index) * Math.PI,
        scale,
        scale * 0.72,
        scale,
      );
      chunk.rocks.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < propCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (11.5 + hash01(this.seed, chunkIndex, 1360 + index) * 8);
      const z = startZ + 2 + hash01(this.seed, chunkIndex, 1420 + index) * (CHUNK_LENGTH - 4);
      const type = hashUint(this.seed, chunkIndex, 1480 + index) % 5;
      const sx = type === 0 ? 0.32 : type === 1 ? 1.8 : type === 2 ? 0.8 : 0.55;
      const sy = type === 0 ? 1.6 : type === 1 ? 0.18 : type === 2 ? 0.65 : 0.85;
      const sz = type === 0 ? 1 : type === 1 ? 2.2 : type === 2 ? 0.8 : 1.2;
      setTransform(this.scratch, x, sy * 0.5, z, 0, sx, sy, sz);
      chunk.roadsideProps.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < potCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (11.2 + hash01(this.seed, chunkIndex, 1520 + index) * 6);
      const z = startZ + 6 + hash01(this.seed, chunkIndex, 1530 + index) * (CHUNK_LENGTH - 12);
      const scale = 0.52 + hash01(this.seed, chunkIndex, 1540 + index) * 0.25;
      setTransform(this.scratch, x, 0.4 * scale, z, 0, scale, scale * 1.18, scale);
      chunk.pots.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < woodPileCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (13 + hash01(this.seed, chunkIndex, 1550 + index) * 7);
      const z = startZ + 5 + hash01(this.seed, chunkIndex, 1560 + index) * (CHUNK_LENGTH - 10);
      setTransform(this.scratch, x, 0.42, z, index * 0.34, 1.8, 0.85, 1.1);
      chunk.woodPiles.setMatrixAt(index, this.scratch.matrix);
    }
    for (let index = 0; index < signCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const x = side * (10.8 + hash01(this.seed, chunkIndex, 1570 + index) * 3);
      const z = startZ + 12 + hash01(this.seed, chunkIndex, 1580 + index) * (CHUNK_LENGTH - 24);
      setTransform(this.scratch, x, 1.7, z, side * -0.12, 1.8, 0.7, 0.15);
      chunk.signs.setMatrixAt(index, this.scratch.matrix);
    }
    chunk.fullGrassCount = grassCount;
    chunk.fullBushCount = bushCount;
    chunk.fullRockCount = rockCount;
    chunk.fullPropCount = propCount;
    chunk.fullPotCount = potCount;
    chunk.fullWoodPileCount = woodPileCount;
    chunk.fullSignCount = signCount;
    chunk.roadsideProps.material = regionType === "Farming"
      ? materials.hay
      : regionType === "Riverside"
        ? materials.clay
        : regionType === "Rocky Area" ? materials.rock : materials.trunk;
    finalizeInstances(chunk.grass, grassCount);
    finalizeInstances(chunk.bushes, bushCount);
    finalizeInstances(chunk.rocks, rockCount);
    finalizeInstances(chunk.roadsideProps, propCount);
    finalizeInstances(chunk.pots, potCount);
    finalizeInstances(chunk.woodPiles, woodPileCount);
    finalizeInstances(chunk.signs, signCount);
  }

  configureWater(chunk, chunkIndex, themeIndex, regionType) {
    const isPond = themeIndex === 6;
    const isCanal = themeIndex === 7;
    const isRiverside = regionType === "Riverside";
    chunk.water.visible = isPond || isCanal || isRiverside;
    if (!chunk.water.visible) return;
    const side = hash01(this.seed, chunkIndex, 1510) > 0.5 ? 1 : -1;
    if (isPond && !isRiverside) {
      chunk.water.position.set(side * 34, 0.055, chunkIndex * CHUNK_LENGTH + 42);
      chunk.water.scale.set(24, 15, 1);
    } else {
      chunk.water.position.set(side * 25, 0.055, chunkIndex * CHUNK_LENGTH + 40);
      chunk.water.scale.set(isRiverside ? 11 : 5, CHUNK_LENGTH + 2, 1);
    }
  }

  configureWorldEvent(chunk, chunkIndex, difficulty, regionType) {
    const cadence = Math.max(9, 14 - Math.floor(difficulty * 0.55));
    const eventSlot = hashUint(this.seed, 0, 1601) % cadence;
    const hasEvent = ((chunkIndex % cadence) + cadence) % cadence === eventSlot;
    if (!hasEvent) {
      chunk.event = "None";
      chunk.fullEventCount = 0;
      finalizeInstances(chunk.eventPeople, 0);
      return;
    }
    const sequence = Math.floor(chunkIndex / cadence);
    const eventIndex = (
      sequence + (hashUint(this.seed, 0, 1602) % WORLD_EVENTS.length)
    ) % WORLD_EVENTS.length;
    const normalizedEventIndex = eventIndex < 0 ? eventIndex + WORLD_EVENTS.length : eventIndex;
    const count =
      normalizedEventIndex === 5
        ? 18
        : normalizedEventIndex === 0
          ? 14
          : 8 + normalizedEventIndex;
    const side = hash01(this.seed, chunkIndex, 1603) > 0.5 ? 1 : -1;
    for (let index = 0; index < count; index += 1) {
      const x = side * (13.5 + (index % 5) * 0.9);
      const z = chunkIndex * CHUNK_LENGTH + 23 + Math.floor(index / 5) * 2.1;
      const scale =
        normalizedEventIndex === 2 && index > count / 2
          ? 0.56
          : 0.82 + (index % 3) * 0.08;
      setTransform(this.scratch, x, 0.62 * scale, z, 0, scale, scale, scale);
      chunk.eventPeople.setMatrixAt(index, this.scratch.matrix);
    }
    chunk.event = regionType === "Forest"
      ? "Woodcutters"
      : regionType === "Riverside"
        ? "Fishermen"
        : regionType === "Farming"
          ? "Farmers Harvesting"
          : WORLD_EVENTS[normalizedEventIndex];
    chunk.fullEventCount = count;
    finalizeInstances(chunk.eventPeople, count);
  }

  configure(chunk, chunkIndex, difficulty, region) {
    const themeIndex = themeIndexFor(this.seed, chunkIndex);
    const theme = THEME_DEFINITIONS[themeIndex];
    const regionDefinition = REGION_DEFINITIONS[region.type];
    for (let index = 0; index < OBSTACLES_PER_CHUNK; index += 1) {
      const obstacle = this.obstaclePool[chunk.obstacleStart + index];
      obstacle.x = 10000;
      obstacle.z = 10000;
      obstacle.radius = 0;
    }
    this.fillGround(chunk, chunkIndex);
    this.configureTrees(chunk, chunkIndex, theme, regionDefinition);
    this.configureCrops(chunk, chunkIndex, themeIndex, theme, regionDefinition);
    this.configureRoadside(
      chunk,
      chunkIndex,
      difficulty,
      region.type,
      regionDefinition,
    );
    this.configureWater(chunk, chunkIndex, themeIndex, region.type);
    this.configureWorldEvent(chunk, chunkIndex, difficulty, region.type);
    chunk.themeIndex = themeIndex;
    chunk.theme = theme.name;
  }
}

export class VillageGenerator {
  constructor(seed) {
    this.seed = seed;
    this.scratch = new THREE.Object3D();
  }

  configureVillageDetails(chunk, chunkIndex, houseCount, regionType) {
    hideMeshPool(chunk.villageMeshPool);
    if (houseCount <= 0) return 0;
    const baseZ = chunkIndex * CHUNK_LENGTH;
    let used = 0;
    const combinations = hashUint(this.seed, chunkIndex, 1700);
    const addFeature = (geometry, material, x, y, z, sx, sy, sz, rotation = 0) => {
      if (used >= chunk.villageMeshPool.length) return;
      configureMesh(
        chunk.villageMeshPool[used],
        geometry,
        material,
        x,
        y,
        z,
        sx,
        sy,
        sz,
        rotation,
      );
      used += 1;
    };
    const side = combinations % 2 ? 1 : -1;
    if (regionType === "Forest") {
      for (let index = 0; index < 3; index += 1) {
        addFeature(
          geometries.cylinder,
          materials.trunk,
          side * (21 + index * 3),
          1.8,
          baseZ + 16 + index * 14,
          0.7,
          3.6,
          0.7,
        );
        addFeature(
          geometries.sphere,
          materials.leaf,
          side * (21 + index * 3),
          4.6,
          baseZ + 16 + index * 14,
          2.5,
          2.1,
          2.5,
        );
      }
    } else if (regionType === "Riverside") {
      addFeature(
        geometries.box,
        materials.trunk,
        side * 25,
        0.45,
        baseZ + 28,
        4.8,
        0.45,
        1.5,
        0.2,
      );
      for (let index = 0; index < 4; index += 1) {
        addFeature(
          geometries.sphere,
          materials.clay,
          -side * (17 + (index % 2) * 1.2),
          0.5,
          baseZ + 35 + Math.floor(index / 2) * 1.2,
          0.65,
          0.85,
          0.65,
        );
      }
    } else if (regionType === "Farming") {
      for (let index = 0; index < 4; index += 1) {
        addFeature(
          index % 2 ? geometries.box : geometries.cone,
          materials.hay,
          side * (18 + (index % 2) * 3),
          index % 2 ? 0.65 : 1.2,
          baseZ + 18 + index * 10,
          index % 2 ? 1.8 : 1.2,
          index % 2 ? 1.3 : 2.4,
          index % 2 ? 1.2 : 1.2,
        );
      }
    }
    if (combinations & 1) {
      addFeature(geometries.cylinder, materials.rock, side * 18, 0.7, baseZ + 18, 1.5, 0.8, 1.5);
      addFeature(geometries.torus, materials.rock, side * 18, 1.35, baseZ + 18, 1.5, 1.5, 1.5);
    }
    if (combinations & 2) {
      addFeature(geometries.cone, materials.bright, -side * 23, 3.3, baseZ + 34, 2.5, 5.5, 2.5);
    }
    if (combinations & 4) {
      addFeature(geometries.box, materials.roofStraw, side * 20, 1.1, baseZ + 49, 4.2, 2.2, 3.5);
    }
    if (combinations & 8) {
      addFeature(geometries.cone, materials.hay, -side * 20, 1.3, baseZ + 57, 2.4, 2.6, 2.4);
    }
    if (combinations & 16) {
      addFeature(geometries.cylinder, materials.plasterBlue, side * 27, 5.2, baseZ + 61, 2.1, 7.5, 2.1);
    }
    if (combinations & 32) {
      addFeature(geometries.box, materials.trunk, -side * 18, 1.2, baseZ + 13, 4.6, 2.4, 3.4);
    }
    if (combinations & 64) {
      for (let index = 0; index < 3; index += 1) {
        addFeature(
          geometries.box,
          index % 2 ? materials.bright : materials.event,
          side * (15 + index * 2.2),
          0.75,
          baseZ + 69,
          1.8,
          1.5,
          1.5,
        );
      }
    }
    return used;
  }

  configure(chunk, chunkIndex, region) {
    const isVillage =
      chunk.themeIndex === 8
      || chunk.themeIndex === 9
      || hash01(this.seed, chunkIndex, 1710) > 0.89;
    if (!isVillage) {
      chunk.village = "None";
      chunk.fullHouseCount = 0;
      finalizeInstances(chunk.houses, 0);
      finalizeInstances(chunk.roofs, 0);
      hideMeshPool(chunk.villageMeshPool);
      return;
    }
    const houseCount =
      chunk.themeIndex === 9
        ? 10 + (hashUint(this.seed, chunkIndex, 1711) % 5)
        : 5 + (hashUint(this.seed, chunkIndex, 1712) % 5);
    const startZ = chunkIndex * CHUNK_LENGTH;
    for (let index = 0; index < houseCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const rank = Math.floor(index / 2);
      const x = side * (20 + (rank % 2) * 7 + hash01(this.seed, chunkIndex, 1740 + index) * 3);
      const z = startZ + 7 + rank * 10 + hash01(this.seed, chunkIndex, 1780 + index) * 2;
      const rotation = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const scale = 0.82 + hash01(this.seed, chunkIndex, 1820 + index) * 0.32;
      setTransform(this.scratch, x, 1.5 * scale, z, rotation, scale, scale, scale);
      chunk.houses.setMatrixAt(index, this.scratch.matrix);
      setTransform(
        this.scratch,
        x,
        3.85 * scale,
        z,
        rotation + Math.PI / 4,
        scale,
        scale,
        scale,
      );
      chunk.roofs.setMatrixAt(index, this.scratch.matrix);
    }
    chunk.houses.material =
      hash01(this.seed, chunkIndex, 1860) > 0.5 ? materials.plaster : materials.plasterBlue;
    chunk.roofs.material =
      hash01(this.seed, chunkIndex, 1861) > 0.44 ? materials.roof : materials.roofStraw;
    chunk.fullHouseCount = houseCount;
    finalizeInstances(chunk.houses, houseCount);
    finalizeInstances(chunk.roofs, houseCount);
    this.configureVillageDetails(chunk, chunkIndex, houseCount, region.type);
    chunk.village =
      `${VILLAGE_NAMES[hashUint(this.seed, chunkIndex, 1862) % VILLAGE_NAMES.length]} · ${
        region.type
      }`;
  }
}

export class LandmarkManager {
  constructor(seed) {
    this.seed = seed;
  }

  configure(chunk, chunkIndex, region) {
    hideMeshPool(chunk.landmarkMeshPool);
    const cadence = 8;
    const landmarkSlot = hashUint(this.seed, 0, 1900) % cadence;
    const riverBridge = (
      region.type === "Riverside"
      && ((chunkIndex % 6) + 6) % 6 === (hashUint(this.seed, 0, 1899) % 6)
    );
    const hasLandmark = riverBridge
      || ((chunkIndex % cadence) + cadence) % cadence === landmarkSlot;
    if (!hasLandmark) {
      chunk.landmark = "None";
      return;
    }
    const sequence = Math.floor(chunkIndex / cadence);
    const rawType =
      (sequence + (hashUint(this.seed, 0, 1901) % LANDMARKS.length)) % LANDMARKS.length;
    const type = riverBridge
      ? 3
      : rawType < 0 ? rawType + LANDMARKS.length : rawType;
    const pool = chunk.landmarkMeshPool;
    const z = chunkIndex * CHUNK_LENGTH + 48;
    const side = hash01(this.seed, chunkIndex, 1902) > 0.5 ? 1 : -1;
    let used = 0;
    const add = (geometry, material, x, y, positionZ, sx, sy, sz, rotation = 0) => {
      if (used >= pool.length) return;
      configureMesh(pool[used], geometry, material, x, y, positionZ, sx, sy, sz, rotation);
      used += 1;
    };
    if (type === 0) {
      add(geometries.cylinder, materials.trunk, side * 28, 4, z, 2.2, 8, 2.2);
      for (let index = 0; index < 5; index += 1) {
        add(
          geometries.sphere,
          index % 2 ? materials.leafLight : materials.leaf,
          side * 28 + (index - 2) * 2.5,
          9 + (index % 2) * 1.5,
          z + (index % 3 - 1) * 2.2,
          5,
          3.8,
          5,
        );
      }
    } else if (type === 1) {
      add(geometries.cylinder, materials.plaster, side * 31, 6, z, 0.55, 12, 0.55);
      for (let index = 0; index < 4; index += 1) {
        add(
          geometries.box,
          materials.plaster,
          side * 31,
          11.5,
          z,
          index % 2 ? 0.35 : 7,
          0.28,
          index % 2 ? 7 : 0.35,
          index * Math.PI * 0.25,
        );
      }
    } else if (type === 2) {
      add(geometries.box, materials.plaster, side * 27, 3, z, 6, 6, 6);
      add(geometries.cone, materials.bright, side * 27, 10, z, 4, 8, 4);
      add(geometries.sphere, materials.bright, side * 27, 14.2, z, 0.7, 0.7, 0.7);
    } else if (type === 3) {
      add(geometries.box, materials.rock, 0, 0.02, z, 20, 0.04, 12);
      add(geometries.box, materials.trunk, -8.5, 1.2, z, 0.4, 2.4, 12);
      add(geometries.box, materials.trunk, 8.5, 1.2, z, 0.4, 2.4, 12);
    } else if (type === 4) {
      add(geometries.cylinder, materials.plaster, side * 31, 7, z, 1.8, 13, 1.8);
      add(geometries.cylinder, materials.plasterBlue, side * 31, 14.5, z, 4.5, 4.2, 4.5);
    } else if (type === 5) {
      add(geometries.cylinder, materials.trunk, -8.3, 3.2, z, 0.45, 6.4, 0.45);
      add(geometries.cylinder, materials.trunk, 8.3, 3.2, z, 0.45, 6.4, 0.45);
      add(geometries.box, materials.bright, 0, 6.2, z, 17.2, 0.65, 0.55);
    } else {
      add(geometries.cylinder, materials.rock, side * 25, 0.9, z, 3.8, 1.2, 3.8);
      add(geometries.torus, materials.rock, side * 25, 1.75, z, 3.4, 3.4, 3.4);
      for (let index = 0; index < 4; index += 1) {
        add(
          geometries.cylinder,
          materials.trunk,
          side * 25 + Math.cos(index * Math.PI * 0.5) * 4.5,
          1.5,
          z + Math.sin(index * Math.PI * 0.5) * 4.5,
          0.35,
          3,
          0.35,
        );
      }
    }
    chunk.landmark = LANDMARKS[type];
  }
}

export class ChunkManager {
  constructor({
    scene,
    seed,
    roadGenerator,
    environmentGenerator,
    villageGenerator,
    landmarkManager,
    obstacles,
    activeChunkCount = DEFAULT_ACTIVE_CHUNKS,
    poolSize = DEFAULT_CHUNK_POOL_SIZE,
  }) {
    this.scene = scene;
    this.seed = seed;
    this.roadGenerator = roadGenerator;
    this.environmentGenerator = environmentGenerator;
    this.villageGenerator = villageGenerator;
    this.landmarkManager = landmarkManager;
    this.obstacles = obstacles;
    this.activeChunkCount = Math.max(5, activeChunkCount);
    this.poolSize = Math.max(this.activeChunkCount, poolSize);
    this.behindCount = 2;
    this.aheadCount = this.activeChunkCount - this.behindCount - 1;
    this.chunks = [];
    this.currentChunkIndex = Number.NaN;
    this.loadedChunks = 0;
    this.currentDifficulty = 1;
    this.totalObjects = 0;
    this.regionWorldPosition = { x: 0, z: 0 };
    this.regionRouteSample = {};
    this.regionDescriptor = {};
    for (let index = 0; index < this.poolSize; index += 1) {
      const chunk = createChunk(index, obstacles);
      chunk.group.visible = false;
      this.chunks.push(chunk);
      scene.add(chunk.group);
    }
  }

  findChunk(chunkIndex) {
    for (let index = 0; index < this.chunks.length; index += 1) {
      if (this.chunks[index].chunkIndex === chunkIndex) return this.chunks[index];
    }
    return null;
  }

  acquireChunk(minIndex, maxIndex) {
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      if (
        !Number.isFinite(chunk.chunkIndex)
        || chunk.chunkIndex < minIndex
        || chunk.chunkIndex > maxIndex
      ) {
        return chunk;
      }
    }
    return this.chunks[0];
  }

  configureChunk(chunk, chunkIndex, difficulty) {
    chunk.chunkIndex = chunkIndex;
    chunk.group.visible = true;
    chunk.lodLevel = -1;
    this.roadGenerator.configure(chunk, chunkIndex, difficulty);
    this.regionWorldPosition.z = (
      chunkIndex * CHUNK_LENGTH + CHUNK_LENGTH * 0.5
    );
    this.roadGenerator.getRoutePosition(
      this.regionWorldPosition,
      difficulty,
      this.regionRouteSample,
    );
    generateRegionDescriptor(
      this.seed,
      this.regionRouteSample.routeDistance,
      this.regionDescriptor,
    );
    chunk.regionId = this.regionDescriptor.id;
    chunk.regionType = this.regionDescriptor.type;
    chunk.regionClimate = this.regionDescriptor.climate;
    chunk.regionStartRouteDistance =
      this.regionDescriptor.startRouteDistance;
    chunk.regionEndRouteDistance =
      this.regionDescriptor.endRouteDistance;
    this.environmentGenerator.configure(
      chunk,
      chunkIndex,
      difficulty,
      this.regionDescriptor,
    );
    this.villageGenerator.configure(
      chunk,
      chunkIndex,
      this.regionDescriptor,
    );
    this.landmarkManager.configure(
      chunk,
      chunkIndex,
      this.regionDescriptor,
    );
    chunk.objectCount =
      chunk.fullTreeCount * 2
      + chunk.fullCropCount
      + chunk.fullGrassCount
      + chunk.fullBushCount
      + chunk.fullRockCount
      + chunk.fullHouseCount * 2
      + chunk.fullPropCount
      + chunk.fullPotCount
      + chunk.fullWoodPileCount
      + chunk.fullSignCount
      + chunk.fullEventCount
      + (chunk.village === "None" ? 0 : 6)
      + (chunk.landmark === "None" ? 0 : 5)
      + 3;
  }

  ensureRange(currentIndex, difficulty) {
    const minIndex = currentIndex - this.behindCount;
    const maxIndex = currentIndex + this.aheadCount;
    for (let targetIndex = minIndex; targetIndex <= maxIndex; targetIndex += 1) {
      if (this.findChunk(targetIndex)) continue;
      const chunk = this.acquireChunk(minIndex, maxIndex);
      this.configureChunk(chunk, targetIndex, difficulty);
    }
    let loaded = 0;
    let totalObjects = 0;
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      const active = chunk.chunkIndex >= minIndex && chunk.chunkIndex <= maxIndex;
      chunk.group.visible = active;
      if (active) {
        loaded += 1;
        totalObjects += chunk.objectCount;
      }
    }
    this.loadedChunks = loaded;
    this.totalObjects = totalObjects;
  }

  applyLOD(currentIndex) {
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      if (!chunk.group.visible) continue;
      const distance = Math.abs(chunk.chunkIndex - currentIndex);
      const level = distance <= 1 ? 0 : distance <= 3 ? 1 : 2;
      if (chunk.lodLevel === level) continue;
      chunk.lodLevel = level;
      const divisor = level === 0 ? 1 : level === 1 ? 2 : 4;
      chunk.treeTrunks.count = Math.ceil(chunk.fullTreeCount / divisor);
      chunk.treeCrowns.count = Math.ceil(chunk.fullTreeCount / divisor);
      chunk.crops.count = Math.ceil(chunk.fullCropCount / divisor);
      chunk.grass.count = Math.ceil(chunk.fullGrassCount / (divisor * 1.35));
      chunk.bushes.count = Math.ceil(chunk.fullBushCount / divisor);
      chunk.rocks.count = Math.ceil(chunk.fullRockCount / divisor);
      chunk.houses.count = Math.ceil(chunk.fullHouseCount / divisor);
      chunk.roofs.count = Math.ceil(chunk.fullHouseCount / divisor);
      chunk.roadsideProps.count = Math.ceil(chunk.fullPropCount / divisor);
      chunk.pots.count = Math.ceil(chunk.fullPotCount / divisor);
      chunk.woodPiles.count = Math.ceil(chunk.fullWoodPileCount / divisor);
      chunk.signs.count = Math.ceil(chunk.fullSignCount / divisor);
      chunk.eventPeople.count = level === 2 ? 0 : Math.ceil(chunk.fullEventCount / divisor);
    }
  }

  update(playerPosition, difficulty) {
    const currentIndex = Math.floor(playerPosition.z / CHUNK_LENGTH);
    const difficultyChanged = difficulty !== this.currentDifficulty;
    if (currentIndex !== this.currentChunkIndex || difficultyChanged) {
      this.currentChunkIndex = currentIndex;
      this.currentDifficulty = difficulty;
      if (difficultyChanged) {
        for (let index = 0; index < this.chunks.length; index += 1) {
          if (this.chunks[index].group.visible) {
            this.configureChunk(this.chunks[index], this.chunks[index].chunkIndex, difficulty);
          }
        }
      }
      this.ensureRange(currentIndex, difficulty);
    }
    this.applyLOD(currentIndex);
  }

  getCurrentChunk() {
    return this.findChunk(this.currentChunkIndex);
  }
}

export class WorldGenerator {
  constructor(scene, {
    activeChunkCount = DEFAULT_ACTIVE_CHUNKS,
    poolSize = DEFAULT_CHUNK_POOL_SIZE,
    seed,
  } = {}) {
    const generatedSeed = typeof seed === "number"
      ? seed >>> 0
      : (
        (Date.now() >>> 0)
        ^ Math.floor(performance.now() * 1000)
        ^ Math.floor(Math.random() * 0xffffffff)
      ) >>> 0;
    this.scene = scene;
    this.seed = generatedSeed;
    this.obstacles = new Array(poolSize * OBSTACLES_PER_CHUNK);
    this.roadGenerator = new RoadGenerator(generatedSeed);
    this.environmentGenerator = new EnvironmentGenerator(generatedSeed, this.obstacles);
    this.villageGenerator = new VillageGenerator(generatedSeed);
    this.landmarkManager = new LandmarkManager(generatedSeed);
    this.chunkManager = new ChunkManager({
      scene,
      seed: generatedSeed,
      roadGenerator: this.roadGenerator,
      environmentGenerator: this.environmentGenerator,
      villageGenerator: this.villageGenerator,
      landmarkManager: this.landmarkManager,
      obstacles: this.obstacles,
      activeChunkCount,
      poolSize,
    });
    this.regions = new Map();
    this.playerRouteSample = {};
    this.currentRegion = {};
    this.villageRegion = {};
    this.regionTint = new THREE.Color(0xa4cde3);
    this.previousPlayerZ = Number.NaN;
    this.fps = 60;
    this.drawCalls = 0;
    this.debug = {
      currentChunk: 0,
      loadedChunks: 0,
      chunkPoolSize: poolSize,
      currentTheme: "Generating",
      currentVillage: "None",
      landmark: "None",
      objectsSpawned: 0,
      lodLevel: 0,
      drawCalls: 0,
      fps: 60,
      roadLayout: "Straight",
      worldEvent: "None",
      regionId: "None",
      regionType: "Farming",
      nextRegionDistance: 0,
    };
  }

  registerRegion(name, definition) {
    this.regions.set(name, definition);
  }

  sampleRoad(worldPosition, difficulty = 1, target = {}) {
    return this.roadGenerator.sampleRoad(worldPosition, difficulty, target);
  }

  getRoutePosition(worldPosition, difficulty = 1, target = {}) {
    return this.roadGenerator.getRoutePosition(
      worldPosition,
      difficulty,
      target,
    );
  }

  getRegionAtRouteDistance(routeDistance, target = {}) {
    return generateRegionDescriptor(this.seed, routeDistance, target);
  }

  sampleRouteDistance(routeDistance, difficulty = 1, target = {}) {
    return this.roadGenerator.sampleRouteDistance(
      routeDistance,
      difficulty,
      target,
    );
  }

  generateHazardDescriptors(
    startRouteDistance,
    targetRouteDistance,
    difficulty,
    checkpointStates,
    targetHazards,
  ) {
    return this.roadGenerator.generateHazardDescriptors(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      checkpointStates,
      targetHazards,
    );
  }

  generateEventDescriptors(
    startRouteDistance,
    targetRouteDistance,
    difficulty,
    missionKey,
    checkpointStates,
    hazardDescriptors,
    targetEvents,
  ) {
    return this.roadGenerator.generateEventDescriptors(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      checkpointStates,
      hazardDescriptors,
      targetEvents,
    );
  }

  generateRouteNetwork(
    startRouteDistance,
    targetRouteDistance,
    difficulty,
    missionKey,
    destinationVillageName,
    targetJunctions,
    targetMissionRoute,
  ) {
    return this.roadGenerator.generateRouteNetwork(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      destinationVillageName,
      targetJunctions,
      targetMissionRoute,
    );
  }

  generateVillage(
    routeDistance,
    difficulty,
    missionKey,
    preferredName,
    targetVillage,
  ) {
    generateRegionDescriptor(
      this.seed,
      routeDistance,
      this.villageRegion,
    );
    return generateVillageDescriptor(
      this.seed,
      routeDistance,
      difficulty,
      missionKey,
      preferredName,
      targetVillage,
      this.villageRegion,
    );
  }

  reseed() {
    this.seed = hashUint(
      this.seed ^ (Date.now() >>> 0),
      Math.floor(performance.now() * 10),
      2047,
    );
    this.roadGenerator.seed = this.seed;
    this.environmentGenerator.seed = this.seed;
    this.villageGenerator.seed = this.seed;
    this.landmarkManager.seed = this.seed;
    this.chunkManager.seed = this.seed;
    this.chunkManager.currentChunkIndex = Number.NaN;
    for (let index = 0; index < this.chunkManager.chunks.length; index += 1) {
      const chunk = this.chunkManager.chunks[index];
      chunk.chunkIndex = Number.NaN;
      chunk.group.visible = false;
      for (let obstacleIndex = 0; obstacleIndex < OBSTACLES_PER_CHUNK; obstacleIndex += 1) {
        const obstacle = this.obstacles[chunk.obstacleStart + obstacleIndex];
        obstacle.x = 10000;
        obstacle.z = 10000;
        obstacle.radius = 0;
      }
    }
  }

  update(playerPosition, difficulty = 1, delta = 1 / 60, drawCalls = 0) {
    if (
      Number.isFinite(this.previousPlayerZ)
      && playerPosition.z < this.previousPlayerZ - 18
    ) {
      this.reseed();
    }
    this.previousPlayerZ = playerPosition.z;
    this.chunkManager.update(playerPosition, difficulty);
    this.roadGenerator.getRoutePosition(
      playerPosition,
      difficulty,
      this.playerRouteSample,
    );
    generateRegionDescriptor(
      this.seed,
      this.playerRouteSample.routeDistance,
      this.currentRegion,
    );
    const regionDefinition = REGION_DEFINITIONS[this.currentRegion.type];
    this.regionTint.setHex(regionDefinition.tint);
    const tintBlend = 1 - Math.exp(-0.35 * delta);
    if (this.scene.background && this.scene.background.isColor) {
      this.scene.background.lerp(this.regionTint, tintBlend);
    }
    if (this.scene.fog) {
      this.scene.fog.color.lerp(this.regionTint, tintBlend);
    }
    this.fps = THREE.MathUtils.lerp(
      this.fps,
      1 / Math.max(delta, 0.001),
      1 - Math.exp(-2.5 * delta),
    );
    this.drawCalls = drawCalls;
    const current = this.chunkManager.getCurrentChunk();
    this.debug.currentChunk = this.chunkManager.currentChunkIndex;
    this.debug.loadedChunks = this.chunkManager.loadedChunks;
    this.debug.objectsSpawned = this.chunkManager.totalObjects;
    this.debug.drawCalls = drawCalls;
    this.debug.fps = this.fps;
    this.debug.regionId = this.currentRegion.id;
    this.debug.regionType = this.currentRegion.type;
    this.debug.nextRegionDistance = Math.max(
      0,
      this.currentRegion.endRouteDistance
        - this.playerRouteSample.routeDistance,
    );
    if (current) {
      this.debug.currentTheme = current.theme;
      this.debug.currentVillage = current.village;
      this.debug.landmark = current.landmark;
      this.debug.lodLevel = current.lodLevel;
      this.debug.roadLayout = current.layout;
      this.debug.worldEvent = current.event;
    }
  }
}
