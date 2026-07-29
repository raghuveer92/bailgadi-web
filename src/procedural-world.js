import * as THREE from "three";

export const CHUNK_LENGTH = 80;
export const DEFAULT_ACTIVE_CHUNKS = 7;
export const DEFAULT_CHUNK_POOL_SIZE = 9;
export const SURFACE_ROAD = "ROAD";
export const SURFACE_DIRT = "DIRT";
export const SURFACE_GRASS = "GRASS";
export const SURFACE_GRAVEL = "GRAVEL";
export const SURFACE_MUD = "MUD";

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
  return hashUint(seed, chunkIndex, 91) % THEME_DEFINITIONS.length;
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
    target.layout = ROAD_LAYOUTS[layoutIndex];
    return target;
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

  configureTrees(chunk, chunkIndex, theme) {
    const count = theme.trees;
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

  configureCrops(chunk, chunkIndex, themeIndex, theme) {
    const count = theme.crops;
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

  configureRoadside(chunk, chunkIndex, difficulty) {
    const grassCount = 48 + (hashUint(this.seed, chunkIndex, 620) % 25);
    const bushCount = 12 + (hashUint(this.seed, chunkIndex, 621) % 12);
    const rockCount = 8 + (hashUint(this.seed, chunkIndex, 622) % 10);
    const propCount = 8 + (hashUint(this.seed, chunkIndex, 623) % 14);
    const potCount = 2 + (hashUint(this.seed, chunkIndex, 624) % 5);
    const woodPileCount = 2 + (hashUint(this.seed, chunkIndex, 625) % 5);
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
      const x = side * (safeMargin + hash01(this.seed, chunkIndex, 1120 + index) * 16);
      const z = startZ + hash01(this.seed, chunkIndex, 1180 + index) * CHUNK_LENGTH;
      const scale = 0.5 + hash01(this.seed, chunkIndex, 1240 + index) * 0.9;
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
    finalizeInstances(chunk.grass, grassCount);
    finalizeInstances(chunk.bushes, bushCount);
    finalizeInstances(chunk.rocks, rockCount);
    finalizeInstances(chunk.roadsideProps, propCount);
    finalizeInstances(chunk.pots, potCount);
    finalizeInstances(chunk.woodPiles, woodPileCount);
    finalizeInstances(chunk.signs, signCount);
  }

  configureWater(chunk, chunkIndex, themeIndex) {
    const isPond = themeIndex === 6;
    const isCanal = themeIndex === 7;
    chunk.water.visible = isPond || isCanal;
    if (!chunk.water.visible) return;
    const side = hash01(this.seed, chunkIndex, 1510) > 0.5 ? 1 : -1;
    if (isPond) {
      chunk.water.position.set(side * 34, 0.055, chunkIndex * CHUNK_LENGTH + 42);
      chunk.water.scale.set(24, 15, 1);
    } else {
      chunk.water.position.set(side * 23, 0.055, chunkIndex * CHUNK_LENGTH + 40);
      chunk.water.scale.set(5, CHUNK_LENGTH + 2, 1);
    }
  }

  configureWorldEvent(chunk, chunkIndex, difficulty) {
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
    chunk.event = WORLD_EVENTS[normalizedEventIndex];
    chunk.fullEventCount = count;
    finalizeInstances(chunk.eventPeople, count);
  }

  configure(chunk, chunkIndex, difficulty) {
    const themeIndex = themeIndexFor(this.seed, chunkIndex);
    const theme = THEME_DEFINITIONS[themeIndex];
    for (let index = 0; index < OBSTACLES_PER_CHUNK; index += 1) {
      const obstacle = this.obstaclePool[chunk.obstacleStart + index];
      obstacle.x = 10000;
      obstacle.z = 10000;
      obstacle.radius = 0;
    }
    this.fillGround(chunk, chunkIndex);
    this.configureTrees(chunk, chunkIndex, theme);
    this.configureCrops(chunk, chunkIndex, themeIndex, theme);
    this.configureRoadside(chunk, chunkIndex, difficulty);
    this.configureWater(chunk, chunkIndex, themeIndex);
    this.configureWorldEvent(chunk, chunkIndex, difficulty);
    chunk.themeIndex = themeIndex;
    chunk.theme = theme.name;
  }
}

export class VillageGenerator {
  constructor(seed) {
    this.seed = seed;
    this.scratch = new THREE.Object3D();
  }

  configureVillageDetails(chunk, chunkIndex, houseCount) {
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

  configure(chunk, chunkIndex) {
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
    this.configureVillageDetails(chunk, chunkIndex, houseCount);
    chunk.village =
      `${VILLAGE_NAMES[hashUint(this.seed, chunkIndex, 1862) % VILLAGE_NAMES.length]} · ${
        chunk.themeIndex === 9 ? "Centre" : "Outskirts"
      }`;
  }
}

export class LandmarkManager {
  constructor(seed) {
    this.seed = seed;
  }

  configure(chunk, chunkIndex) {
    hideMeshPool(chunk.landmarkMeshPool);
    const cadence = 8;
    const landmarkSlot = hashUint(this.seed, 0, 1900) % cadence;
    const hasLandmark = ((chunkIndex % cadence) + cadence) % cadence === landmarkSlot;
    if (!hasLandmark) {
      chunk.landmark = "None";
      return;
    }
    const sequence = Math.floor(chunkIndex / cadence);
    const rawType =
      (sequence + (hashUint(this.seed, 0, 1901) % LANDMARKS.length)) % LANDMARKS.length;
    const type = rawType < 0 ? rawType + LANDMARKS.length : rawType;
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
    this.environmentGenerator.configure(chunk, chunkIndex, difficulty);
    this.villageGenerator.configure(chunk, chunkIndex);
    this.landmarkManager.configure(chunk, chunkIndex);
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

  sampleRouteDistance(routeDistance, difficulty = 1, target = {}) {
    return this.roadGenerator.sampleRouteDistance(
      routeDistance,
      difficulty,
      target,
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
