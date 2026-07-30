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
  const eventGroup = new THREE.Group();
  eventGroup.name = "ProceduralRouteEvents";
  const routeNetworkGroup = new THREE.Group();
  routeNetworkGroup.name = "MissionRouteNetwork";
  const directionVillagerGroup = new THREE.Group();
  directionVillagerGroup.name = "DirectionVillagers";
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
  group.add(
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
  const branchGeometry = new THREE.BoxGeometry(1, 1, 1);
  for (let index = 0; index < MAX_ROUTE_JUNCTIONS; index += 1) {
    const junctionGroup = new THREE.Group();
    junctionGroup.name = `MissionJunction${index + 1}`;
    const left = new Array(ROUTE_BRANCH_SEGMENTS);
    const right = new Array(ROUTE_BRANCH_SEGMENTS);
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
    junctionVisuals[index] = { group: junctionGroup, left, right };
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
    const side = direction === "LEFT" ? 1 : -1;
    return Math.sin(progress * Math.PI) * ROUTE_BRANCH_OFFSET * side;
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
      mesh.position.set(
        (startX + endX) * 0.5,
        (junctionSampleA.centerY + junctionSampleB.centerY) * 0.5 + 0.025,
        (startZ + endZ) * 0.5,
      );
      mesh.rotation.set(0, Math.atan2(deltaX, deltaZ), 0);
      mesh.scale.set(
        Math.max(5.2, junctionSampleA.width * 0.38),
        0.045,
        Math.hypot(deltaX, deltaZ) + 0.55,
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

  function placeDestination(sample, villageName = "Village") {
    placeMarker(destinationMarker, sample, 0.012);
    destinationMarker.name = `Destination-${villageName}`;
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
    checkpointMarkers,
    checkImpact,
    sampleSurface,
    placeDestination,
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
