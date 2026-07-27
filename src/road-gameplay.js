import * as THREE from "three";

const ROAD_OBSTACLES = [
  { type: "patch", x: -2.8, z: 14, rotation: 0.12 },
  { type: "rock", x: 3.9, z: 43, rotation: 0.4 },
  { type: "pothole", x: -3.5, z: 73, rotation: -0.18 },
  { type: "log", x: 2.7, z: 108, rotation: 0.24 },
  { type: "patch", x: 3.4, z: 141, rotation: -0.2 },
  { type: "rock", x: -4.2, z: 174, rotation: 0.7 },
  { type: "pothole", x: 2.2, z: 208, rotation: 0.16 },
  { type: "log", x: -3.5, z: 247, rotation: -0.3 },
  { type: "patch", x: -1.4, z: 282, rotation: 0.22 },
  { type: "rock", x: 4.1, z: 320, rotation: 0.15 },
  { type: "pothole", x: -3.8, z: 357, rotation: -0.24 },
  { type: "log", x: 3.3, z: 397, rotation: 0.28 },
  { type: "patch", x: -3.1, z: 433, rotation: -0.12 },
  { type: "rock", x: 2.8, z: 462, rotation: 0.55 },
];

const material = (color, roughness = 0.92) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const ROCK = material(0x766d5e);
const ROCK_LIGHT = material(0x958a73);
const WOOD = material(0x67401f);
const WOOD_END = material(0x9b6b38);
const POTHOLE = material(0x765033);
const PATCH = material(0xa97343);
const PATCH_LIGHT = material(0xc08b54);
const DESTINATION_WOOD = material(0x714526);
const DESTINATION_CLOTH = material(0xd7a83d);

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
  if (type === "rock") return createRock();
  if (type === "pothole") return createPothole();
  if (type === "log") return createLog();
  return createPatch();
}

function createDestinationMarker() {
  const marker = new THREE.Group();
  marker.name = "VillageDestination";
  [-1, 1].forEach((side) => {
    const post = prepareMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 5.4, 7),
      DESTINATION_WOOD,
    ));
    post.position.set(side * 8.4, 2.7, 0);
    marker.add(post);
  });
  const beam = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(17.2, 0.28, 0.3),
    DESTINATION_WOOD,
  ));
  beam.position.y = 5.25;
  marker.add(beam);

  for (let x = -6; x <= 6; x += 2) {
    const flag = prepareMesh(new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.65, 3),
      DESTINATION_CLOTH,
    ));
    flag.rotation.z = Math.PI;
    flag.position.set(x, 4.8, 0);
    marker.add(flag);
  }
  marker.position.set(0, 0, 480);
  return marker;
}

export function createRoadGameplay(scene) {
  const group = new THREE.Group();
  group.name = "RoadGameplay";

  const obstacles = ROAD_OBSTACLES.map((placement, index) => {
    const created = createObstacle(placement.type);
    created.group.position.set(placement.x, 0, placement.z);
    created.group.rotation.y = placement.rotation;
    group.add(created.group);
    return {
      ...placement,
      ...created,
      id: index,
      hit: false,
    };
  });
  group.add(createDestinationMarker());
  scene.add(group);

  function checkImpact(position, heading) {
    const sideX = Math.cos(heading);
    const sideZ = -Math.sin(heading);
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    for (const obstacle of obstacles) {
      if (obstacle.hit) continue;
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
    return null;
  }

  function sampleSurface(position, target = {}) {
    let roughness = 0.08;
    let roll = Math.sin(position.z * 0.18 + position.x * 0.31) * 0.12;
    for (const obstacle of obstacles) {
      if (obstacle.type !== "patch" && obstacle.type !== "pothole") continue;
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
    obstacles.forEach((obstacle) => {
      obstacle.hit = false;
    });
  }

  return { group, obstacles, checkImpact, sampleSurface, reset };
}
