import * as THREE from "three";
import { createVillageLife } from "./environment-life.js";

const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const materials = {
  grass: mat(0x6d963c),
  grassLight: mat(0x91ad4f),
  road: mat(0xb98550),
  roadLight: mat(0xc99b61),
  roadTrack: mat(0x9f6f43),
  roadDust: mat(0xd0a268),
  leaf: mat(0x315f32),
  leafLight: mat(0x4d7d3a),
  trunk: mat(0x654326),
  rock: mat(0x80796b),
  rockLight: mat(0xa49b86),
  plaster: mat(0xd7ad70),
  plasterBlue: mat(0x73a5a2),
  roof: mat(0x9d4d2f),
  roofStraw: mat(0xc29a54),
  field: mat(0x9eaa42),
  water: mat(0x65a9b3, 0.35),
  dryGrass: mat(0xb69a4d),
  bush: mat(0x527738),
  clay: mat(0xa85f3d),
  hay: mat(0xc9a84e),
  distantHill: mat(0x708853),
  distantTree: mat(0x3e613d),
};

function seeded(seed = 4567) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function enableShadows(object, cast = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = true;
    }
  });
  return object;
}

function createTree(scale = 1, variant = 0) {
  const tree = new THREE.Group();
  const windParts = [];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.46, 3.5, 7), materials.trunk);
  trunk.position.y = 1.75;
  tree.add(trunk);

  const crownMat = variant ? materials.leafLight : materials.leaf;
  [
    [0, 3.8, 0, 1.45],
    [-0.8, 3.45, 0.1, 1.05],
    [0.8, 3.5, -0.1, 1.12],
    [0, 4.45, -0.1, 1.05],
  ].forEach(([x, y, z, radius]) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), crownMat);
    crown.position.set(x, y, z);
    crown.rotation.set(variant * 0.3, x, z);
    tree.add(crown);
    windParts.push(crown);
  });
  tree.scale.setScalar(scale);
  tree.userData.windParts = windParts;
  return enableShadows(tree);
}

function createRock(scale = 1) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), materials.rock);
  rock.scale.set(scale * 1.2, scale * 0.7, scale);
  rock.rotation.set(0.15, scale * 0.8, -0.1);
  rock.position.y = 0.4 * scale;
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function createHouse(color = materials.plaster, straw = false) {
  const house = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3, 4.4), color);
  base.position.y = 1.5;
  house.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.9, 2.1, 4),
    straw ? materials.roofStraw : materials.roof,
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.85;
  roof.position.y = 3.85;
  house.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.9, 0.12), materials.trunk);
  door.position.set(0, 0.95, 2.25);
  house.add(door);

  [-1.55, 1.55].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.12), materials.plasterBlue);
    window.position.set(x, 1.85, 2.25);
    house.add(window);
  });
  return enableShadows(house);
}

function createField(width, depth, cropColor) {
  const group = new THREE.Group();
  const crops = new THREE.Group();
  crops.name = "Crops";
  const soil = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), mat(0x8c6a3d));
  soil.position.y = 0.04;
  soil.receiveShadow = true;
  group.add(soil);
  const cropMaterial = mat(cropColor);
  const cropPositions = [];
  for (let x = -width / 2 + 0.8; x < width / 2; x += 1.15) {
    for (let z = -depth / 2 + 0.7; z < depth / 2; z += 1.2) {
      cropPositions.push([x, z]);
    }
  }
  const cropGeometry = new THREE.ConeGeometry(0.16, 0.8, 5);
  const cropInstances = new THREE.InstancedMesh(cropGeometry, cropMaterial, cropPositions.length);
  const transform = new THREE.Object3D();
  cropPositions.forEach(([x, z], index) => {
    transform.position.set(x, 0.45, z);
    transform.updateMatrix();
    cropInstances.setMatrixAt(index, transform.matrix);
  });
  cropInstances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  cropInstances.castShadow = true;
  cropInstances.receiveShadow = true;
  crops.add(cropInstances);
  group.add(crops);
  group.userData.windParts = [crops];
  return group;
}

function createRoadsideShrine() {
  const shrine = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), mat(0xe2b050));
  base.position.y = 0.18;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.65, 0.85), mat(0xd6673a));
  pillar.position.y = 1.15;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.75, 4), mat(0xf1c85e));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.35;
  shrine.add(base, pillar, roof);
  return enableShadows(shrine);
}

function createRoadSurfaceDetail(scene, random) {
  const transform = new THREE.Object3D();
  const trackGeometry = new THREE.PlaneGeometry(0.28, 6.4);
  const tracks = new THREE.InstancedMesh(trackGeometry, materials.roadTrack, 186);
  let trackIndex = 0;
  for (let z = -330; z < 500; z += 9) {
    [-1, 1].forEach((side) => {
      transform.position.set(side * (3.45 + (random() - 0.5) * 0.18), 0.052, z);
      transform.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.018);
      transform.scale.set(0.8 + random() * 0.35, 0.78 + random() * 0.28, 1);
      transform.updateMatrix();
      tracks.setMatrixAt(trackIndex, transform.matrix);
      trackIndex += 1;
    });
  }
  tracks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  tracks.receiveShadow = true;
  scene.add(tracks);

  const patchGeometry = new THREE.CircleGeometry(1, 9);
  const patches = new THREE.InstancedMesh(patchGeometry, materials.roadDust, 42);
  for (let index = 0; index < 42; index += 1) {
    const side = index % 2 ? 1 : -1;
    transform.position.set(side * (6.3 + random() * 2.2), 0.056, -300 + random() * 780);
    transform.rotation.set(-Math.PI / 2, 0, random() * Math.PI);
    transform.scale.set(0.55 + random() * 1.2, 0.3 + random() * 0.55, 1);
    transform.updateMatrix();
    patches.setMatrixAt(index, transform.matrix);
  }
  patches.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  scene.add(patches);
}

function createRoadsideDetails(scene, random) {
  const transform = new THREE.Object3D();

  const grassGeometry = new THREE.ConeGeometry(0.18, 0.8, 5);
  const grass = new THREE.InstancedMesh(grassGeometry, materials.dryGrass, 150);
  for (let index = 0; index < 150; index += 1) {
    const side = index % 2 ? 1 : -1;
    transform.position.set(side * (10.1 + random() * 4.9), 0.34, -305 + random() * 790);
    transform.rotation.set((random() - 0.5) * 0.08, random() * Math.PI, (random() - 0.5) * 0.12);
    transform.scale.set(0.7 + random() * 0.8, 0.65 + random() * 0.75, 0.7 + random() * 0.8);
    transform.updateMatrix();
    grass.setMatrixAt(index, transform.matrix);
  }
  grass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  grass.castShadow = false;
  grass.receiveShadow = true;
  scene.add(grass);

  const bushGeometry = new THREE.DodecahedronGeometry(0.72, 0);
  const bushes = new THREE.InstancedMesh(bushGeometry, materials.bush, 52);
  for (let index = 0; index < 52; index += 1) {
    const side = index % 2 ? 1 : -1;
    transform.position.set(side * (11.7 + random() * 8.5), 0.5, -290 + random() * 760);
    transform.rotation.set(0, random() * Math.PI, 0);
    transform.scale.set(0.7 + random() * 0.65, 0.55 + random() * 0.5, 0.75 + random() * 0.7);
    transform.updateMatrix();
    bushes.setMatrixAt(index, transform.matrix);
  }
  bushes.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bushes.castShadow = true;
  bushes.receiveShadow = true;
  scene.add(bushes);

  const stoneGeometry = new THREE.DodecahedronGeometry(0.2, 0);
  const stones = new THREE.InstancedMesh(stoneGeometry, materials.rockLight, 58);
  for (let index = 0; index < 58; index += 1) {
    const side = index % 2 ? 1 : -1;
    transform.position.set(side * (9.9 + random() * 3.8), 0.13, -310 + random() * 790);
    transform.rotation.set(random(), random() * Math.PI, random() * 0.4);
    transform.scale.set(0.55 + random(), 0.35 + random() * 0.45, 0.55 + random());
    transform.updateMatrix();
    stones.setMatrixAt(index, transform.matrix);
  }
  stones.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  stones.castShadow = false;
  stones.receiveShadow = true;
  scene.add(stones);

  const propGroup = new THREE.Group();
  propGroup.name = "PooledRoadsideProps";
  const postGeometry = new THREE.BoxGeometry(0.16, 1.25, 0.16);
  const railGeometry = new THREE.BoxGeometry(0.12, 0.12, 2.5);
  const fenceMaterial = materials.trunk;
  [-145, -44, 71, 188, 305, 410].forEach((z, placementIndex) => {
    const side = placementIndex % 2 ? 1 : -1;
    for (let index = 0; index < 4; index += 1) {
      const post = new THREE.Mesh(postGeometry, fenceMaterial);
      post.position.set(side * (12.8 + index * 0.04), 0.62, z + index * 2.4);
      propGroup.add(post);
      if (index < 3) {
        const rail = new THREE.Mesh(railGeometry, fenceMaterial);
        rail.position.set(side * 12.8, 0.78, z + 1.2 + index * 2.4);
        propGroup.add(rail);
      }
    }
  });

  const hayGeometry = new THREE.ConeGeometry(1.25, 1.55, 9);
  [-104, 25, 137, 229, 362].forEach((z, index) => {
    const hay = new THREE.Mesh(hayGeometry, materials.hay);
    hay.position.set((index % 2 ? 1 : -1) * 14.5, 0.77, z);
    hay.rotation.y = index * 0.8;
    propGroup.add(hay);
  });

  const potGeometry = new THREE.SphereGeometry(0.42, 8, 6);
  const potRimGeometry = new THREE.TorusGeometry(0.28, 0.065, 5, 9);
  [-72, 48, 164, 274, 398].forEach((z, index) => {
    const side = index % 2 ? 1 : -1;
    const pot = new THREE.Mesh(potGeometry, materials.clay);
    pot.scale.y = 1.18;
    pot.position.set(side * 11.7, 0.43, z);
    const rim = new THREE.Mesh(potRimGeometry, materials.clay);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(side * 11.7, 0.79, z);
    propGroup.add(pot, rim);
  });

  const cartBedGeometry = new THREE.BoxGeometry(2.2, 0.18, 1.5);
  const cartWheelGeometry = new THREE.TorusGeometry(0.48, 0.1, 6, 12);
  [-18, 116, 257, 382].forEach((z, index) => {
    const parkedCart = new THREE.Group();
    const bed = new THREE.Mesh(cartBedGeometry, materials.trunk);
    bed.position.y = 0.88;
    parkedCart.add(bed);
    [-1, 1].forEach((side) => {
      const wheel = new THREE.Mesh(cartWheelGeometry, materials.trunk);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(side * 1.08, 0.48, 0);
      parkedCart.add(wheel);
    });
    parkedCart.position.set((index % 2 ? 1 : -1) * 15.8, 0, z);
    parkedCart.rotation.y = index % 2 ? -0.18 : 0.18;
    propGroup.add(parkedCart);
  });

  const signPostGeometry = new THREE.BoxGeometry(0.16, 2.15, 0.16);
  const signBoardGeometry = new THREE.BoxGeometry(1.9, 0.7, 0.13);
  [-156, 92, 218, 344].forEach((z, index) => {
    const side = index % 2 ? 1 : -1;
    const sign = new THREE.Group();
    const post = new THREE.Mesh(signPostGeometry, materials.trunk);
    post.position.y = 1.08;
    const board = new THREE.Mesh(signBoardGeometry, index % 2 ? materials.plasterBlue : materials.roof);
    board.position.y = 1.9;
    sign.add(post, board);
    sign.position.set(side * 11.5, 0, z);
    sign.rotation.y = side * -0.18;
    propGroup.add(sign);
  });
  enableShadows(propGroup);
  scene.add(propGroup);
}

function createHorizon(scene) {
  const hills = new THREE.Group();
  hills.name = "DistantHorizon";
  [
    [-105, 410, 52, 22],
    [-58, 438, 44, 18],
    [62, 430, 48, 20],
    [112, 405, 58, 24],
  ].forEach(([x, z, width, height]) => {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(width, height, 7), materials.distantHill);
    hill.position.set(x, height * 0.35, z);
    hill.scale.z = 0.65;
    hills.add(hill);
  });
  for (let index = 0; index < 18; index += 1) {
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(2.1 + (index % 3) * 0.45, 7 + (index % 4), 6),
      materials.distantTree,
    );
    tree.position.set(-82 + index * 9.5, 3.5, 423 + (index % 3) * 7);
    hills.add(tree);
  }
  for (let index = 0; index < 7; index += 1) {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(4 + (index % 2), 4.5 + (index % 3), 4),
      index % 2 ? materials.plaster : materials.plasterBlue,
    );
    building.position.set(-43 + index * 14, 2.3, 448 + (index % 2) * 5);
    hills.add(building);
  }
  scene.add(hills);
}

export function createWorld(scene) {
  const obstacles = [];
  const windTargets = [];
  const random = seeded();

  scene.background = new THREE.Color(0xa4cde3);
  scene.fog = new THREE.Fog(0xa4cde3, 90, 285);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 900), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 80;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(19, 900), materials.road);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.035, 80);
  road.receiveShadow = true;
  scene.add(road);

  createRoadSurfaceDetail(scene, random);
  createRoadsideDetails(scene, random);
  createHorizon(scene);

  const fieldPlacements = [
    [-39, 8, 40, 38, 0xc1b948],
    [43, 60, 44, 48, 0x7f9d35],
    [-45, 128, 50, 44, 0xb3a93d],
    [42, 205, 38, 58, 0x6f9c43],
    [-42, 292, 44, 54, 0xaeba48],
    [45, -85, 42, 50, 0x7e9d3c],
  ];
  fieldPlacements.forEach(([x, z, w, d, color]) => {
    const field = createField(w, d, color);
    field.position.set(x, 0.04, z);
    scene.add(field);
    field.userData.windParts.forEach((object, index) => {
      windTargets.push({
        object,
        worldX: x,
        worldZ: z,
        baseX: object.rotation.x,
        baseZ: object.rotation.z,
        phase: x * 0.17 + z * 0.09 + index * 0.7,
        speed: 0.65 + (Math.abs(z) % 5) * 0.04,
        amount: 0.0018,
        range: 155,
      });
    });
  });

  const housePlacements = [
    [-21, 38, 0.08, materials.plaster, false],
    [25, 45, -0.12, materials.plasterBlue, true],
    [-30, 91, 0.12, materials.plaster, true],
    [29, 121, -0.2, mat(0xd39a67), false],
    [-25, 182, 0.1, materials.plasterBlue, false],
    [27, 252, -0.16, materials.plaster, true],
    [-26, -65, 0.12, materials.plaster, true],
  ];
  housePlacements.forEach(([x, z, rotation, color, straw]) => {
    const house = createHouse(color, straw);
    house.position.set(x, 0, z);
    house.rotation.y = rotation + (x > 0 ? -Math.PI / 2 : Math.PI / 2);
    scene.add(house);
    obstacles.push({ x, z, radius: 4.3 });
  });

  for (let i = 0; i < 65; i += 1) {
    const side = random() > 0.5 ? 1 : -1;
    const x = side * (14 + random() * 95);
    const z = -300 + random() * 800;
    const scale = 0.75 + random() * 0.85;
    const tree = createTree(scale, i % 3 === 0 ? 1 : 0);
    tree.position.set(x, 0, z);
    tree.rotation.y = random() * Math.PI * 2;
    scene.add(tree);
    tree.userData.windParts.forEach((object, partIndex) => {
      windTargets.push({
        object,
        worldX: x,
        worldZ: z,
        baseX: object.rotation.x,
        baseZ: object.rotation.z,
        phase: i * 0.53 + partIndex * 0.8,
        speed: 0.55 + (i % 4) * 0.07,
        amount: 0.008,
        range: 130,
      });
    });
    if (Math.abs(x) < 27) obstacles.push({ x, z, radius: 1.4 * scale });
  }

  for (let i = 0; i < 34; i += 1) {
    const roadRock = i < 5;
    const side = random() > 0.5 ? 1 : -1;
    const x = roadRock ? side * (6.6 + random() * 1.3) : side * (12 + random() * 70);
    const z = -210 + random() * 620;
    const scale = 0.45 + random() * 0.75;
    const rock = createRock(scale);
    rock.position.x = x;
    rock.position.z = z;
    scene.add(rock);
    obstacles.push({ x, z, radius: 0.75 * scale });
  }

  for (let z = -120; z < 320; z += 38) {
    const side = Math.floor(z / 38) % 2 ? 1 : -1;
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.3, 5), materials.plaster);
    marker.position.set(side * 10.7, 0.65, z);
    marker.castShadow = true;
    scene.add(marker);
  }

  const shrine = createRoadsideShrine();
  shrine.position.set(-12.5, 0, 156);
  shrine.rotation.y = Math.PI / 2;
  scene.add(shrine);

  const pond = new THREE.Mesh(new THREE.CircleGeometry(10, 28), materials.water);
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(1.5, 1, 1);
  pond.position.set(47, 0.08, 340);
  scene.add(pond);

  const villageLife = createVillageLife(scene, { random, windTargets });

  const sun = new THREE.DirectionalLight(0xffdfaa, 3.05);
  sun.position.set(-42, 65, -25);
  sun.castShadow = true;
  const mobileShadows = Math.min(window.innerWidth, window.innerHeight) < 800;
  sun.shadow.mapSize.set(mobileShadows ? 1024 : 2048, mobileShadows ? 1024 : 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xd8e9ef, 0x62713d, 1.82));

  return { obstacles, sun, villageLife };
}
