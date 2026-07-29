import * as THREE from "three";
import {
  HAZARD_BROKEN_CART_WHEEL,
  HAZARD_FALLEN_BRANCH,
  HAZARD_HAY_BUNDLE,
  HAZARD_POTHOLE,
  HAZARD_ROCK,
  HAZARD_WOODEN_LOG,
  MAX_ROUTE_HAZARDS,
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
const DESTINATION_WOOD = material(0x714526);
const DESTINATION_CLOTH = material(0xd7a83d);
const DESTINATION_PLASTER = material(0xd9b271);
const DESTINATION_LEAF = material(0x3f6b38);

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

  const templeBase = prepareMesh(new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 4.8, 5.2),
    DESTINATION_PLASTER,
  ));
  templeBase.position.set(-14, 2.4, 9);
  marker.add(templeBase);
  const templeTower = prepareMesh(new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 8.5, 8),
    DESTINATION_CLOTH,
  ));
  templeTower.position.set(-14, 8.95, 9);
  marker.add(templeTower);
  const templeFinial = prepareMesh(new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 7, 5),
    DESTINATION_WOOD,
  ));
  templeFinial.position.set(-14, 13.25, 9);
  marker.add(templeFinial);

  const banyanTrunk = prepareMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.15, 6.4, 8),
    DESTINATION_WOOD,
  ));
  banyanTrunk.position.set(14.5, 3.2, 11);
  marker.add(banyanTrunk);
  [
    [14.5, 7.2, 11, 3.7],
    [11.9, 6.5, 11.2, 2.8],
    [17.2, 6.6, 10.8, 2.9],
    [14.4, 9.3, 10.8, 2.7],
  ].forEach(([x, y, z, radius]) => {
    const crown = prepareMesh(new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      DESTINATION_LEAF,
    ));
    crown.position.set(x, y, z);
    marker.add(crown);
  });
  marker.visible = false;
  return marker;
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
  const missionGroup = new THREE.Group();
  missionGroup.name = "MissionRouteMarkers";
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
  group.add(missionGroup, hazardGroup);

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

  function placeDestination(sample) {
    placeMarker(destinationMarker, sample, 0.012);
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
    resetMissionMarkers();
  }

  return {
    group,
    missionGroup,
    hazardGroup,
    hazards: obstacles,
    destinationMarker,
    checkpointMarkers,
    checkImpact,
    sampleSurface,
    placeDestination,
    placeCheckpoint,
    setCheckpointTriggered,
    resetMissionMarkers,
    configureHazards,
    resetHazards,
    reset,
  };
}
