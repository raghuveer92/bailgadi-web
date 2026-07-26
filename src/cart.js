import * as THREE from "three";

const mat = (color, roughness = 0.86) => new THREE.MeshStandardMaterial({ color, roughness });
const WOOD = mat(0x6b351b);
const LIGHT_WOOD = mat(0x9c6332);
const DARK_WOOD = mat(0x3e2115);
const IRON = mat(0x302b27, 0.72);
const HIDE = mat(0xe8dfc6);
const HIDE_GREY = mat(0xc8c3b4);
const HORN = mat(0xf0e5c7);
const DARK = mat(0x302a24);
const ROPE = mat(0xa8844e);
const CLOTH = mat(0xc14932);
const KURTA = mat(0xd9a33b);
const TURBAN = mat(0xb83f2f);
const SKIN = mat(0x9b5f36);
const WHITE = mat(0xeee3c8);

const Y_AXIS = new THREE.Vector3(0, 1, 0);

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

function sphere(radius, material, width = 8, height = 6) {
  return shadow(new THREE.Mesh(new THREE.SphereGeometry(radius, width, height), material));
}

function rodBetween(start, end, radius, material, segments = 7) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = cylinder(radius, radius, direction.length(), segments, material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  return rod;
}

function createHorn(side) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.32, 0.24, 0.08),
    new THREE.Vector3(side * 0.5, 0.43, 0.04),
    new THREE.Vector3(side * 0.7, 0.62, -0.04),
    new THREE.Vector3(side * 0.76, 0.88, -0.1),
  ]);
  return shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.075, 5, false), HORN));
}

function createLeg(x, z, coat, diagonalPhase) {
  const hip = new THREE.Group();
  hip.position.set(x, 1.3, z);

  const upper = cylinder(0.16, 0.125, 0.66, 6, coat);
  upper.position.y = -0.32;
  hip.add(upper);

  const knee = new THREE.Group();
  knee.position.y = -0.63;
  const lower = cylinder(0.12, 0.085, 0.58, 6, coat);
  lower.position.y = -0.27;
  const fetlock = sphere(0.13, coat, 6, 5);
  fetlock.position.y = -0.55;
  const hoof = box(0.27, 0.17, 0.36, DARK);
  hoof.position.set(0, -0.68, 0.07);
  knee.add(lower, fetlock, hoof);
  hip.add(knee);

  return { root: hip, knee, diagonalPhase };
}

function createBull(x, coat, accent, phaseOffset, animationParts) {
  const bull = new THREE.Group();
  bull.name = x < 0 ? "LeftBull" : "RightBull";
  bull.position.set(x, 0, 4.05);

  const upperBody = new THREE.Group();
  upperBody.name = "UpperBody";
  bull.add(upperBody);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.5, 4, 8), coat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.06, 1, 1.04);
  torso.position.set(0, 1.65, -0.12);
  upperBody.add(shadow(torso));

  const chest = sphere(0.72, coat);
  chest.scale.set(1.08, 1.02, 0.92);
  chest.position.set(0, 1.7, 0.72);
  upperBody.add(chest);

  const hump = sphere(0.63, coat);
  hump.scale.set(1, 0.8, 0.9);
  hump.position.set(0, 2.16, 0.3);
  upperBody.add(hump);

  const shoulderLeft = sphere(0.32, accent, 7, 5);
  shoulderLeft.scale.set(0.75, 1, 1);
  shoulderLeft.position.set(-0.58, 1.55, 0.62);
  const shoulderRight = shoulderLeft.clone();
  shoulderRight.position.x = 0.58;
  upperBody.add(shoulderLeft, shoulderRight);

  const neck = cylinder(0.43, 0.61, 1.2, 7, coat);
  neck.rotation.x = -0.36;
  neck.position.set(0, 1.83, 1.2);
  upperBody.add(neck);

  const dewlap = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.95, 6), accent);
  dewlap.rotation.x = 0.48;
  dewlap.position.set(0, 1.38, 1.35);
  upperBody.add(shadow(dewlap));

  const headPivot = new THREE.Group();
  headPivot.name = "Head";
  headPivot.position.set(0, 1.88, 1.77);
  upperBody.add(headPivot);

  const head = box(0.84, 0.7, 1, coat);
  head.position.z = 0.1;
  headPivot.add(head);

  const brow = box(0.9, 0.2, 0.48, accent);
  brow.position.set(0, 0.2, 0.31);
  headPivot.add(brow);

  const muzzle = box(0.7, 0.4, 0.48, accent);
  muzzle.position.set(0, -0.19, 0.68);
  headPivot.add(muzzle);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), coat);
    ear.rotation.z = -side * Math.PI / 2;
    ear.position.set(side * 0.58, 0.12, 0.08);
    headPivot.add(shadow(ear));

    const horn = createHorn(side);
    headPivot.add(horn);

    const eye = sphere(0.058, DARK, 6, 5);
    eye.position.set(side * 0.43, 0.12, 0.52);
    headPivot.add(eye);
  });

  const legs = [
    createLeg(-0.43, 0.68, coat, 0),
    createLeg(0.43, 0.68, coat, Math.PI),
    createLeg(-0.43, -0.78, coat, Math.PI),
    createLeg(0.43, -0.78, coat, 0),
  ];
  legs.forEach((leg) => bull.add(leg.root));

  const tailPivot = new THREE.Group();
  tailPivot.name = "Tail";
  tailPivot.position.set(0, 1.86, -1.28);
  const tailUpper = cylinder(0.06, 0.045, 0.72, 5, coat);
  tailUpper.position.y = -0.32;
  tailUpper.rotation.x = -0.18;
  const tailLower = cylinder(0.045, 0.03, 0.55, 5, coat);
  tailLower.position.set(0, -0.83, 0.1);
  tailLower.rotation.x = -0.12;
  const tuft = sphere(0.13, DARK, 6, 5);
  tuft.scale.set(0.65, 1.25, 0.65);
  tuft.position.set(0, -1.12, 0.16);
  tailPivot.add(tailUpper, tailLower, tuft);
  upperBody.add(tailPivot);

  animationParts.bulls.push({
    root: bull,
    upperBody,
    head: headPivot,
    legs,
    tail: tailPivot,
    phaseOffset,
    legSwing: [0, 0, 0, 0],
    kneeBend: [0, 0, 0, 0],
  });
  return bull;
}

function createSpokedWheel(x, z, animationParts) {
  const pivot = new THREE.Group();
  pivot.name = x < 0 ? "LeftWheel" : "RightWheel";
  pivot.position.set(x, 1.25, z);

  const rim = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.21, 7, 20), DARK_WOOD));
  rim.rotation.y = Math.PI / 2;
  pivot.add(rim);

  const hub = cylinder(0.27, 0.27, 0.55, 10, LIGHT_WOOD);
  hub.rotation.z = Math.PI / 2;
  pivot.add(hub);

  const hubCap = cylinder(0.12, 0.12, 0.62, 8, IRON);
  hubCap.rotation.z = Math.PI / 2;
  pivot.add(hubCap);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const spoke = box(0.1, 1.82, 0.1, LIGHT_WOOD);
    spoke.position.set(0, Math.cos(angle) * 0.02, Math.sin(angle) * 0.02);
    spoke.rotation.x = angle;
    pivot.add(spoke);
  }

  animationParts.wheels.push(pivot);
  return pivot;
}

function createDriver() {
  const driver = new THREE.Group();
  driver.name = "Driver";
  driver.position.set(0, 1.88, -0.75);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.56, 1.12, 7), KURTA);
  torso.position.y = 0.75;
  driver.add(shadow(torso));

  const waistCloth = cylinder(0.54, 0.58, 0.42, 7, WHITE);
  waistCloth.position.y = 0.19;
  driver.add(waistCloth);

  const neck = cylinder(0.13, 0.14, 0.2, 7, SKIN);
  neck.position.y = 1.39;
  driver.add(neck);

  const head = sphere(0.34, SKIN, 8, 6);
  head.scale.set(0.9, 1.06, 0.92);
  head.position.y = 1.72;
  driver.add(head);

  const turbanBase = cylinder(0.39, 0.4, 0.28, 9, TURBAN);
  turbanBase.position.y = 2.02;
  driver.add(turbanBase);
  const turbanTop = sphere(0.33, TURBAN, 8, 5);
  turbanTop.scale.set(1.02, 0.58, 1.02);
  turbanTop.position.y = 2.2;
  driver.add(turbanTop);
  const turbanFold = box(0.1, 0.38, 0.05, mat(0xe8b34d));
  turbanFold.position.set(0, 2.08, 0.37);
  driver.add(turbanFold);

  const leftShoulder = new THREE.Vector3(-0.43, 1.13, 0.05);
  const rightShoulder = new THREE.Vector3(0.43, 1.13, 0.05);
  const leftHand = new THREE.Vector3(-0.42, 0.84, 0.95);
  const rightHand = new THREE.Vector3(0.42, 0.84, 0.95);
  driver.add(
    rodBetween(leftShoulder, leftHand, 0.12, KURTA, 6),
    rodBetween(rightShoulder, rightHand, 0.12, KURTA, 6),
  );
  const leftFist = sphere(0.14, SKIN, 7, 5);
  leftFist.position.copy(leftHand);
  const rightFist = leftFist.clone();
  rightFist.position.copy(rightHand);
  driver.add(leftFist, rightFist);

  [-1, 1].forEach((side) => {
    const thighStart = new THREE.Vector3(side * 0.28, 0.28, 0.08);
    const knee = new THREE.Vector3(side * 0.34, 0.02, 0.66);
    const foot = new THREE.Vector3(side * 0.34, -0.55, 0.73);
    driver.add(
      rodBetween(thighStart, knee, 0.16, WHITE, 6),
      rodBetween(knee, foot, 0.13, SKIN, 6),
    );
    const sandal = box(0.25, 0.1, 0.42, DARK_WOOD);
    sandal.position.copy(foot).add(new THREE.Vector3(0, -0.08, 0.1));
    driver.add(sandal);
  });

  return driver;
}

function addCartBody(sprungGroup) {
  const underFrame = box(3.5, 0.28, 3.35, DARK_WOOD);
  underFrame.position.set(0, 1.36, -2.08);
  sprungGroup.add(underFrame);

  for (let z = -3.38; z <= -0.78; z += 0.43) {
    const plank = box(3.62, 0.15, 0.36, z % 0.86 === 0 ? WOOD : LIGHT_WOOD);
    plank.position.set(0, 1.58, z);
    sprungGroup.add(plank);
  }

  [-1, 1].forEach((side) => {
    const lowerRail = box(0.18, 0.18, 3.25, DARK_WOOD);
    lowerRail.position.set(side * 1.77, 1.76, -2.08);
    const upperRail = box(0.16, 0.17, 3.25, LIGHT_WOOD);
    upperRail.position.set(side * 1.77, 2.72, -2.08);
    sprungGroup.add(lowerRail, upperRail);

    for (let z = -3.48; z <= -0.68; z += 0.56) {
      const post = box(0.17, 1.05, 0.16, WOOD);
      post.position.set(side * 1.77, 2.23, z);
      sprungGroup.add(post);
    }
  });

  const backLower = box(3.58, 0.18, 0.18, DARK_WOOD);
  backLower.position.set(0, 1.8, -3.62);
  const backTop = box(3.58, 0.18, 0.18, LIGHT_WOOD);
  backTop.position.set(0, 2.72, -3.62);
  sprungGroup.add(backLower, backTop);
  for (let x = -1.68; x <= 1.68; x += 0.48) {
    const slat = box(0.15, 1.02, 0.17, WOOD);
    slat.position.set(x, 2.24, -3.62);
    sprungGroup.add(slat);
  }

  const sack = sphere(0.67, mat(0xc8a96b));
  sack.scale.set(1.2, 0.65, 1);
  sack.position.set(0.73, 1.94, -2.45);
  sprungGroup.add(sack);

  const cloth = box(1.08, 0.08, 1.35, CLOTH);
  cloth.rotation.y = 0.17;
  cloth.position.set(-0.72, 1.72, -2.72);
  sprungGroup.add(cloth);
}

export function createBullockCart() {
  const group = new THREE.Group();
  group.name = "BullockCart";
  const animationParts = {
    wheels: [],
    bulls: [],
    gaitDistance: 0,
    walkBlend: 0,
    suspensionY: 0,
    suspensionRoll: 0,
    driverReaction: 0,
    lastStepIndex: 0,
    roadImpactStrength: 0,
    roadImpactSide: 0,
    roadImpactTime: 0,
  };

  const bulls = new THREE.Group();
  bulls.name = "Bulls";
  bulls.add(
    createBull(-1.08, HIDE, HIDE_GREY, 0, animationParts),
    createBull(1.08, HIDE_GREY, HIDE, 0.18, animationParts),
  );
  group.add(bulls);

  const runningGear = new THREE.Group();
  runningGear.name = "RunningGear";
  const axle = cylinder(0.18, 0.18, 4.6, 9, IRON);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 1.25, -2.06);
  runningGear.add(axle);
  runningGear.add(
    createSpokedWheel(-2.08, -2.06, animationParts),
    createSpokedWheel(2.08, -2.06, animationParts),
  );
  group.add(runningGear);

  const sprungGroup = new THREE.Group();
  sprungGroup.name = "CartBody";
  addCartBody(sprungGroup);
  const driver = createDriver();
  sprungGroup.add(driver);
  group.add(sprungGroup);
  animationParts.sprungGroup = sprungGroup;
  animationParts.driver = driver;

  const harness = new THREE.Group();
  harness.name = "YokeAndPoles";
  const rearLeft = new THREE.Vector3(-0.86, 1.46, -0.58);
  const rearRight = new THREE.Vector3(0.86, 1.46, -0.58);
  const frontLeft = new THREE.Vector3(-0.96, 2.16, 4.38);
  const frontRight = new THREE.Vector3(0.96, 2.16, 4.38);
  harness.add(
    rodBetween(rearLeft, frontLeft, 0.1, WOOD),
    rodBetween(rearRight, frontRight, 0.1, WOOD),
  );

  const yokeBeam = box(3.7, 0.22, 0.28, LIGHT_WOOD);
  yokeBeam.position.set(0, 2.2, 4.38);
  harness.add(yokeBeam);
  [-1, 1].forEach((side) => {
    const shoulderPad = box(0.86, 0.18, 0.48, WOOD);
    shoulderPad.position.set(side * 1.08, 2.1, 4.38);
    harness.add(shoulderPad);

    const collarLeft = rodBetween(
      new THREE.Vector3(side * 1.08 - 0.28, 2.15, 4.39),
      new THREE.Vector3(side * 1.08 - 0.28, 1.67, 4.5),
      0.055,
      ROPE,
      6,
    );
    const collarRight = rodBetween(
      new THREE.Vector3(side * 1.08 + 0.28, 2.15, 4.39),
      new THREE.Vector3(side * 1.08 + 0.28, 1.67, 4.5),
      0.055,
      ROPE,
      6,
    );
    harness.add(collarLeft, collarRight);
  });
  group.add(harness);

  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { group, animationParts };
}

export function animateCart(
  parts,
  speed,
  travelledDistance,
  elapsed,
  delta,
  roadSurface = { roughness: 0, roll: 0 },
) {
  parts.wheels.forEach((wheel) => {
    wheel.rotation.x += travelledDistance / 1.36;
  });

  parts.gaitDistance += Math.abs(travelledDistance);
  const targetWalk = Math.abs(speed) > 0.05 ? 1 : 0;
  parts.walkBlend = THREE.MathUtils.lerp(
    parts.walkBlend,
    targetWalk,
    1 - Math.exp(-(targetWalk ? 6 : 4) * delta),
  );

  const movement = Math.min(Math.abs(speed) / 4.8, 1);
  const gaitPhase = parts.gaitDistance * 3.35;
  const stepIndex = Math.floor(gaitPhase / Math.PI);
  const stepContact = stepIndex !== parts.lastStepIndex && parts.walkBlend > 0.2;
  parts.lastStepIndex = stepIndex;

  parts.bulls.forEach((bullData) => {
    const phase = gaitPhase + bullData.phaseOffset;
    const breathing = Math.sin(elapsed * 1.55 + bullData.phaseOffset) * 0.014;
    const stepLift = Math.abs(Math.sin(phase * 2)) * 0.045 * parts.walkBlend;
    bullData.upperBody.position.y = breathing + stepLift;

    bullData.legs.forEach((leg, index) => {
      const stride = Math.sin(phase + leg.diagonalPhase);
      const targetSwing = stride * 0.46 * parts.walkBlend;
      const targetKnee = Math.max(0, -stride) * 0.34 * parts.walkBlend;
      bullData.legSwing[index] = THREE.MathUtils.lerp(
        bullData.legSwing[index],
        targetSwing,
        1 - Math.exp(-10 * delta),
      );
      bullData.kneeBend[index] = THREE.MathUtils.lerp(
        bullData.kneeBend[index],
        targetKnee,
        1 - Math.exp(-12 * delta),
      );
      leg.root.rotation.x = bullData.legSwing[index];
      leg.knee.rotation.x = bullData.kneeBend[index];
    });

    bullData.head.rotation.x =
      -0.08
      + Math.sin(phase * 2 + 0.4) * 0.055 * parts.walkBlend
      + Math.sin(elapsed * 1.2 + bullData.phaseOffset) * 0.012;

    const tailAmount = 0.12 + movement * 0.2;
    bullData.tail.rotation.z =
      Math.sin(elapsed * (1.3 + movement * 1.4) + bullData.phaseOffset * 2) * tailAmount;
    bullData.tail.rotation.x = -0.08 + Math.sin(elapsed * 0.9 + bullData.phaseOffset) * 0.045;
  });

  const roadRoughness = THREE.MathUtils.clamp(roadSurface.roughness ?? 0, 0, 1);
  const roadRipple =
    Math.sin(parts.gaitDistance * 4.7 + 0.35)
    + Math.sin(parts.gaitDistance * 2.15 + 1.2) * 0.45;
  let impactY = 0;
  let impactRoll = 0;
  if (parts.roadImpactStrength > 0.001) {
    parts.roadImpactTime += delta;
    const impactDecay = Math.exp(-parts.roadImpactTime * 4.8);
    impactY =
      Math.sin(parts.roadImpactTime * 24) * parts.roadImpactStrength * impactDecay;
    impactRoll =
      Math.sin(parts.roadImpactTime * 19)
      * parts.roadImpactStrength
      * parts.roadImpactSide
      * 0.42
      * impactDecay;
    if (impactDecay < 0.025) parts.roadImpactStrength = 0;
  }

  const suspensionTargetY =
    movement * (
      Math.sin(elapsed * (4.2 + movement * 2.4)) * 0.018
      + Math.abs(Math.sin(gaitPhase * 0.72)) * 0.02
      + roadRipple * roadRoughness * 0.018
    )
    + impactY;
  const suspensionTargetRoll =
    movement * (
      Math.sin(elapsed * 3.1 + 0.5) * 0.014
      + (roadSurface.roll ?? 0) * roadRoughness * 0.016
    )
    + impactRoll;
  parts.suspensionY = THREE.MathUtils.lerp(
    parts.suspensionY,
    suspensionTargetY,
    1 - Math.exp(-6 * delta),
  );
  parts.suspensionRoll = THREE.MathUtils.lerp(
    parts.suspensionRoll,
    suspensionTargetRoll,
    1 - Math.exp(-5 * delta),
  );
  parts.sprungGroup.position.y = parts.suspensionY;
  parts.sprungGroup.rotation.z = parts.suspensionRoll;

  parts.driverReaction = THREE.MathUtils.lerp(
    parts.driverReaction,
    0,
    1 - Math.exp(-3.4 * delta),
  );
  parts.driver.rotation.x = -parts.suspensionY * 0.65 + parts.driverReaction;
  parts.driver.rotation.z = -parts.suspensionRoll * 0.75;
  parts.driver.position.y = 1.88 + Math.sin(elapsed * 1.4) * 0.006;

  return { stepContact };
}

export function reactDriver(parts, command) {
  parts.driverReaction = command === "forward" ? 0.09 : -0.055;
}

export function triggerCartBump(parts, intensity = 1, side = 0) {
  parts.roadImpactStrength = Math.max(parts.roadImpactStrength, 0.11 * intensity);
  parts.roadImpactSide = side || (Math.random() > 0.5 ? 0.35 : -0.35);
  parts.roadImpactTime = 0;
}

export function resetCartAnimation(parts) {
  parts.gaitDistance = 0;
  parts.walkBlend = 0;
  parts.suspensionY = 0;
  parts.suspensionRoll = 0;
  parts.driverReaction = 0;
  parts.roadImpactStrength = 0;
  parts.roadImpactSide = 0;
  parts.roadImpactTime = 0;
  parts.lastStepIndex = 0;
  parts.wheels.forEach((wheel) => {
    wheel.rotation.x = 0;
  });
  parts.bulls.forEach((bull) => {
    bull.legSwing.fill(0);
    bull.kneeBend.fill(0);
    bull.upperBody.position.y = 0;
    bull.head.rotation.x = -0.08;
    bull.legs.forEach((leg) => {
      leg.root.rotation.x = 0;
      leg.knee.rotation.x = 0;
    });
  });
  parts.sprungGroup.position.y = 0;
  parts.sprungGroup.rotation.z = 0;
  parts.driver.rotation.set(0, 0, 0);
  parts.driver.position.y = 1.88;
}
