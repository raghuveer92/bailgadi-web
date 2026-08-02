import * as THREE from "three";
import { createVillageLife } from "./environment-life.js";
import { WorldGenerator } from "./procedural-world.js";

function seeded(seed) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value, 16807) % 2147483647;
    if (value <= 0) value += 2147483646;
    return (value - 1) / 2147483646;
  };
}

export function createWorld(scene) {
  scene.background = new THREE.Color(0xa4cde3);
  scene.fog = new THREE.Fog(0xa4cde3, 82, 142);
  const requestedSeed = Number.parseInt(
    new URLSearchParams(window.location.search).get("seed") || "",
    10,
  );

  const worldGenerator = new WorldGenerator(scene, {
    activeChunkCount: 5,
    poolSize: 7,
    seed: Number.isFinite(requestedSeed) ? requestedSeed : undefined,
  });
  const random = seeded(worldGenerator.seed ^ 0x5f3759df);
  const villageLife = createVillageLife(scene, { random, windTargets: [] });

  const sun = new THREE.DirectionalLight(0xffdfaa, 3.05);
  sun.position.set(-42, 65, -25);
  sun.castShadow = true;
  const mobileShadows = Math.min(window.innerWidth, window.innerHeight) < 800;
  sun.shadow.mapSize.set(
    mobileShadows ? 1024 : 2048,
    mobileShadows ? 1024 : 2048,
  );
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xd8e9ef, 0x62713d, 1.82));

  return {
    obstacles: worldGenerator.obstacles,
    sun,
    villageLife,
    worldGenerator,
    sampleRoad: (position, difficulty = 1, target = {}) => (
      worldGenerator.sampleRoad(position, difficulty, target)
    ),
    getRoutePosition: (position, difficulty = 1, target = {}) => (
      worldGenerator.getRoutePosition(position, difficulty, target)
    ),
    checkWaterAhead: (position, heading, lookAhead, target) => (
      worldGenerator.checkWaterAhead(position, heading, lookAhead, target)
    ),
    sampleRouteDistance: (routeDistance, difficulty = 1, target = {}) => (
      worldGenerator.sampleRouteDistance(routeDistance, difficulty, target)
    ),
    getRegionAtRouteDistance: (routeDistance, target = {}) => (
      worldGenerator.getRegionAtRouteDistance(routeDistance, target)
    ),
    generateHazardDescriptors: (
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      checkpointStates,
      targetHazards,
    ) => worldGenerator.generateHazardDescriptors(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      checkpointStates,
      targetHazards,
    ),
    generateEventDescriptors: (
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      checkpointStates,
      hazardDescriptors,
      targetEvents,
    ) => worldGenerator.generateEventDescriptors(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      checkpointStates,
      hazardDescriptors,
      targetEvents,
    ),
    generateRouteNetwork: (
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      destinationVillageName,
      targetJunctions,
      targetMissionRoute,
    ) => worldGenerator.generateRouteNetwork(
      startRouteDistance,
      targetRouteDistance,
      difficulty,
      missionKey,
      destinationVillageName,
      targetJunctions,
      targetMissionRoute,
    ),
    configureJunctionRoads: (
      junctions,
      count,
      difficulty,
    ) => worldGenerator.configureJunctionRoads(
      junctions,
      count,
      difficulty,
    ),
    generateVillage: (
      routeDistance,
      difficulty,
      missionKey,
      preferredName,
      targetVillage,
    ) => worldGenerator.generateVillage(
      routeDistance,
      difficulty,
      missionKey,
      preferredName,
      targetVillage,
    ),
  };
}
