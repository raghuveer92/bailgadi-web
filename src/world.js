import * as THREE from "three";

const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const materials = {
  grass: mat(0x6d963c),
  grassLight: mat(0x91ad4f),
  road: mat(0xb98550),
  roadLight: mat(0xc99b61),
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
  });
  tree.scale.setScalar(scale);
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
  const soil = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), mat(0x8c6a3d));
  soil.position.y = 0.04;
  soil.receiveShadow = true;
  group.add(soil);
  const cropMaterial = mat(cropColor);
  for (let x = -width / 2 + 0.8; x < width / 2; x += 1.15) {
    for (let z = -depth / 2 + 0.7; z < depth / 2; z += 1.2) {
      const crop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 5), cropMaterial);
      crop.position.set(x, 0.45, z);
      crop.castShadow = true;
      group.add(crop);
    }
  }
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

export function createWorld(scene) {
  const obstacles = [];
  const random = seeded();

  scene.background = new THREE.Color(0xa4cde3);
  scene.fog = new THREE.Fog(0xa4cde3, 75, 230);

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

  for (let z = -330; z < 500; z += 9) {
    const rut = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 5.6), materials.roadLight);
    rut.rotation.x = -Math.PI / 2;
    rut.rotation.z = (random() - 0.5) * 0.06;
    rut.position.set((random() > 0.5 ? 1 : -1) * (3.6 + random() * 1.1), 0.05, z + random() * 3);
    rut.receiveShadow = true;
    scene.add(rut);
  }

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

  const sun = new THREE.DirectionalLight(0xfff1c7, 3.1);
  sun.position.set(-42, 65, -25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xcde7ff, 0x56713b, 1.85));

  return { obstacles, sun };
}

