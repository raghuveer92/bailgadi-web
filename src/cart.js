import * as THREE from "three";

const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
const WOOD = mat(0x6b351b);
const LIGHT_WOOD = mat(0x9c6332);
const DARK_WOOD = mat(0x3e2115);
const HIDE = mat(0xe8dfc6);
const HIDE_GREY = mat(0xc9c5b6);
const HORN = mat(0xeee4c5);
const DARK = mat(0x332d26);
const ROPE = mat(0xa8844e);
const CLOTH = mat(0xc14932);

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, material) {
  return shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
}

function cylinder(rt, rb, h, segments, material) {
  return shadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material));
}

function createBull(x, coat, accent, animationParts) {
  const bull = new THREE.Group();
  bull.position.set(x, 0, 3.9);

  const body = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.55, 4, 8), coat));
  body.rotation.x = Math.PI / 2;
  body.position.y = 1.62;
  bull.add(body);

  const hump = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.67, 8, 6), coat));
  hump.scale.set(1, 0.85, 0.9);
  hump.position.set(0, 2.05, 0.35);
  bull.add(hump);

  const neck = cylinder(0.48, 0.6, 1.15, 7, coat);
  neck.rotation.x = -0.3;
  neck.position.set(0, 1.72, 1.25);
  bull.add(neck);

  const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.68, 1.02), coat));
  head.position.set(0, 1.78, 1.88);
  head.rotation.x = -0.14;
  bull.add(head);

  const muzzle = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.4, 0.45), accent));
  muzzle.position.set(0, 1.59, 2.42);
  bull.add(muzzle);

  [-1, 1].forEach((side) => {
    const ear = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), coat));
    ear.rotation.z = -side * Math.PI / 2;
    ear.position.set(side * 0.55, 1.93, 1.82);
    bull.add(ear);

    const horn = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 7), HORN));
    horn.rotation.z = -side * 0.68;
    horn.rotation.x = -0.15;
    horn.position.set(side * 0.47, 2.3, 1.75);
    bull.add(horn);

    const eye = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), DARK));
    eye.position.set(side * 0.415, 1.91, 2.28);
    bull.add(eye);
  });

  const legs = [];
  [
    [-0.42, 0.55, 0.7, 0],
    [0.42, 0.55, 0.7, Math.PI],
    [-0.42, 0.55, -0.72, Math.PI],
    [0.42, 0.55, -0.72, 0],
  ].forEach(([lx, ly, lz, phase]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 1.18, lz);
    const leg = cylinder(0.13, 0.1, 1.05, 6, coat);
    leg.position.y = -0.52;
    const hoof = box(0.28, 0.18, 0.38, DARK);
    hoof.position.set(0, -1.05, 0.06);
    legPivot.add(leg, hoof);
    bull.add(legPivot);
    legs.push({ pivot: legPivot, phase });
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.8, -1.22);
  const tail = cylinder(0.05, 0.035, 1.18, 5, coat);
  tail.position.y = -0.5;
  tail.rotation.x = -0.2;
  tailPivot.add(tail);
  bull.add(tailPivot);

  animationParts.bulls.push({ bull, body, head, legs, tail: tailPivot, phase: x > 0 ? Math.PI : 0 });
  return bull;
}

function createSpokedWheel(x, z, animationParts) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 1.25, z);

  const wheel = cylinder(1.35, 1.35, 0.28, 18, DARK_WOOD);
  wheel.rotation.z = Math.PI / 2;
  pivot.add(wheel);

  const hub = cylinder(0.25, 0.25, 0.48, 10, LIGHT_WOOD);
  hub.rotation.z = Math.PI / 2;
  pivot.add(hub);

  for (let i = 0; i < 10; i += 1) {
    const spoke = box(0.12, 2.25, 0.1, LIGHT_WOOD);
    spoke.rotation.x = (i / 10) * Math.PI;
    pivot.add(spoke);
  }

  animationParts.wheels.push(pivot);
  return pivot;
}

export function createBullockCart() {
  const group = new THREE.Group();
  group.name = "BullockCart";
  const animationParts = { wheels: [], bulls: [] };

  const leftBull = createBull(-1.05, HIDE, HIDE_GREY, animationParts);
  const rightBull = createBull(1.05, HIDE_GREY, HIDE, animationParts);
  group.add(leftBull, rightBull);

  const cartBed = box(3.7, 0.35, 3.2, LIGHT_WOOD);
  cartBed.position.set(0, 1.55, -2.1);
  group.add(cartBed);

  [-1, 1].forEach((side) => {
    const rail = box(0.16, 1.2, 3.25, WOOD);
    rail.position.set(side * 1.75, 2.1, -2.1);
    group.add(rail);
    for (let z = -3.35; z <= -0.85; z += 0.65) {
      const slat = box(0.16, 1.1, 0.13, LIGHT_WOOD);
      slat.position.set(side * 1.75, 2.15, z);
      group.add(slat);
    }
  });

  const backRail = box(3.65, 1.05, 0.18, WOOD);
  backRail.position.set(0, 2.1, -3.63);
  group.add(backRail);

  const sack = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.67, 8, 6), mat(0xc8a96b)));
  sack.scale.set(1.2, 0.65, 1);
  sack.position.set(0.65, 1.98, -2.25);
  group.add(sack);

  const cloth = box(1.15, 0.08, 1.45, CLOTH);
  cloth.rotation.y = 0.16;
  cloth.position.set(-0.7, 1.78, -2.65);
  group.add(cloth);

  group.add(
    createSpokedWheel(-2.05, -2.05, animationParts),
    createSpokedWheel(2.05, -2.05, animationParts),
  );

  [-1, 1].forEach((side) => {
    const pole = cylinder(0.095, 0.095, 6.2, 7, WOOD);
    pole.rotation.x = Math.PI / 2;
    pole.position.set(side * 0.82, 1.36, 0.7);
    group.add(pole);
  });

  const yoke = box(3.45, 0.18, 0.24, LIGHT_WOOD);
  yoke.position.set(0, 2.1, 3.9);
  group.add(yoke);

  [-1, 1].forEach((side) => {
    const collar = cylinder(0.06, 0.06, 1.45, 6, ROPE);
    collar.rotation.z = Math.PI / 2;
    collar.position.set(side * 1.05, 1.93, 3.98);
    group.add(collar);
  });

  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { group, animationParts };
}

export function animateCart(parts, speed, elapsed, delta) {
  const wheelSpin = speed * delta / 1.35;
  parts.wheels.forEach((wheel) => { wheel.rotation.x += wheelSpin; });

  const movement = Math.min(Math.abs(speed) / 4, 1);
  const walkTime = elapsed * (2.4 + movement * 3.2);
  parts.bulls.forEach((bullData) => {
    bullData.legs.forEach(({ pivot, phase }) => {
      pivot.rotation.x = Math.sin(walkTime + phase + bullData.phase) * 0.42 * movement;
    });
    bullData.body.position.y = 1.62 + Math.abs(Math.sin(walkTime * 2)) * 0.055 * movement;
    bullData.head.rotation.x = -0.14 + Math.sin(walkTime * 2) * 0.035 * movement;
    bullData.tail.rotation.z = Math.sin(walkTime * 0.7 + bullData.phase) * 0.22;
  });
}

