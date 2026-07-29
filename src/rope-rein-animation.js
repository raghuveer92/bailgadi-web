import * as THREE from "three";

const ROPE_SEGMENTS = 10;
const REIN_SEGMENTS = 12;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const SEGMENT_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 6);
const ROPE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x5d3822,
  roughness: 0.94,
});
const REIN_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x3f2418,
  roughness: 0.92,
});

function damp(current, target, response, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-response * delta));
}

function createDynamicLine(segmentCount, material, radius) {
  const positions = new Float32Array((segmentCount + 1) * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: material.color, transparent: true, opacity: 0 }),
  );
  line.visible = false;

  const segmentGroup = new THREE.Group();
  const segmentMeshes = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const segment = new THREE.Mesh(SEGMENT_GEOMETRY, material);
    segment.scale.set(radius, 1, radius);
    segment.castShadow = false;
    segment.receiveShadow = false;
    segment.renderOrder = 3;
    segmentGroup.add(segment);
    segmentMeshes.push(segment);
  }

  return {
    line,
    segmentGroup,
    segmentMeshes,
    positions,
    attribute,
    segmentCount,
    curve: new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ], false, "catmullrom", 0.45),
    sample: new THREE.Vector3(),
    segmentStart: new THREE.Vector3(),
    segmentEnd: new THREE.Vector3(),
    segmentDirection: new THREE.Vector3(),
  };
}

function sampleLine(dynamicLine) {
  const { curve, sample, positions, segmentCount, attribute } = dynamicLine;
  for (let index = 0; index <= segmentCount; index += 1) {
    curve.getPoint(index / segmentCount, sample);
    const offset = index * 3;
    positions[offset] = sample.x;
    positions[offset + 1] = sample.y;
    positions[offset + 2] = sample.z;
  }
  attribute.needsUpdate = true;

  for (let index = 0; index < segmentCount; index += 1) {
    const startOffset = index * 3;
    const endOffset = startOffset + 3;
    dynamicLine.segmentStart.fromArray(positions, startOffset);
    dynamicLine.segmentEnd.fromArray(positions, endOffset);
    dynamicLine.segmentDirection.subVectors(
      dynamicLine.segmentEnd,
      dynamicLine.segmentStart,
    );
    const segment = dynamicLine.segmentMeshes[index];
    segment.position.copy(dynamicLine.segmentStart)
      .add(dynamicLine.segmentEnd)
      .multiplyScalar(0.5);
    segment.scale.y = dynamicLine.segmentDirection.length();
    segment.quaternion.setFromUnitVectors(
      Y_AXIS,
      dynamicLine.segmentDirection.normalize(),
    );
  }
}

function anchorInRoot(anchor, root, target, worldPoint) {
  anchor.getWorldPosition(worldPoint);
  target.copy(worldPoint);
  root.worldToLocal(target);
  return target;
}

function setupTrace(trace, side) {
  trace.side = side;
  trace.start = new THREE.Vector3();
  trace.end = new THREE.Vector3();
  trace.worldPoint = new THREE.Vector3();
}

function setupRein(rein, side) {
  rein.side = side;
  rein.start = new THREE.Vector3();
  rein.end = new THREE.Vector3();
  rein.worldPoint = new THREE.Vector3();
}

export function createRopeReinAnimation(root, parts) {
  const group = new THREE.Group();
  group.name = "RopesAndReins";
  root.add(group);

  const traces = parts.bulls.map((bull, index) => {
    const trace = createDynamicLine(ROPE_SEGMENTS, ROPE_MATERIAL, 0.05);
    trace.startAnchor = bull.ropeAnchor;
    trace.endAnchor = parts.cartRopeAnchors[index];
    setupTrace(trace, index === 0 ? -1 : 1);
    group.add(trace.segmentGroup);
    return trace;
  });

  const reins = parts.bulls.map((bull, index) => {
    const rein = createDynamicLine(REIN_SEGMENTS, REIN_MATERIAL, 0.04);
    rein.startAnchor = parts.driverHandAnchors[index];
    rein.endAnchor = bull.reinAnchor;
    setupRein(rein, index === 0 ? -1 : 1);
    group.add(rein.segmentGroup);
    return rein;
  });

  return {
    root,
    traces,
    reins,
    ropeTension: 0.22,
    reinTension: 0.24,
    inputAmount: 0,
    inputTarget: 0,
    inputHold: 0,
    inputSource: "manual",
    inputDirection: "idle",
    driverInputState: "IDLE",
    suspension: { y: 0, roll: 0, pitch: 0 },
  };
}

export function triggerRopeReinInput(system, direction, source = "input") {
  if (!system) return;
  system.inputDirection = direction;
  system.inputSource = source === "voice-model" ? "voice" : "manual";
  system.inputTarget = direction === "forward" ? -1 : 1;
  system.inputHold = direction === "forward" ? 0.24 : 0.34;
  system.driverInputState =
    `${direction === "forward" ? "FORWARD" : "BRAKE"} · ${system.inputSource.toUpperCase()}`;
}

function updateDriverInput(system, delta) {
  if (system.inputHold > 0) {
    system.inputHold = Math.max(0, system.inputHold - delta);
  } else {
    system.inputTarget = 0;
  }
  system.inputAmount = damp(
    system.inputAmount,
    system.inputTarget,
    system.inputTarget === 0 ? 5.2 : 11,
    delta,
  );
  if (
    system.inputHold === 0
    && Math.abs(system.inputAmount) < 0.025
    && Math.abs(system.inputTarget) < 0.01
  ) {
    system.inputAmount = 0;
    system.inputDirection = "idle";
    system.driverInputState = "IDLE";
  } else if (system.inputHold === 0) {
    system.driverInputState = "RETURNING";
  }
}

function updateTrace(trace, system, elapsed, speedRatio, suspension, vibration) {
  const points = trace.curve.points;
  anchorInRoot(trace.startAnchor, system.root, trace.start, trace.worldPoint);
  anchorInRoot(trace.endAnchor, system.root, trace.end, trace.worldPoint);

  const sag = THREE.MathUtils.lerp(0.3, 0.075, system.ropeTension);
  const sway =
    Math.sin(elapsed * 5.1 + trace.side * 0.9) * vibration
    + suspension.roll * trace.side * 0.22;
  const bounce =
    Math.sin(elapsed * 7.4 + trace.side * 1.7) * vibration * 0.55
    + suspension.y * 0.32;

  points[0].copy(trace.start);
  points[1].lerpVectors(trace.start, trace.end, 0.2);
  points[2].lerpVectors(trace.start, trace.end, 0.48);
  points[3].lerpVectors(trace.start, trace.end, 0.76);
  points[4].copy(trace.end);

  // Keep the trace outside each bull's flank before it converges on the cart.
  points[1].x += trace.side * (0.22 + (1 - system.ropeTension) * 0.06);
  points[2].x += trace.side * 0.14 + sway;
  points[3].x += sway * 0.5;
  points[1].y -= sag * 0.55;
  points[2].y -= sag + bounce;
  points[3].y -= sag * 0.72 + bounce * 0.45;
  points[1].z += speedRatio * 0.025;
  sampleLine(trace);
}

function updateRein(rein, system, elapsed, speedRatio, suspension, vibration) {
  const points = rein.curve.points;
  anchorInRoot(rein.startAnchor, system.root, rein.start, rein.worldPoint);
  anchorInRoot(rein.endAnchor, system.root, rein.end, rein.worldPoint);

  const sag = THREE.MathUtils.lerp(0.48, 0.11, system.reinTension);
  const roadMotion =
    Math.sin(elapsed * 6.2 + rein.side * 1.4) * vibration * 0.8
    + suspension.y * 0.45;
  const lateral =
    Math.sin(elapsed * 4.15 + rein.side) * vibration * 0.42
    + suspension.roll * rein.side * 0.3;

  points[0].copy(rein.start);
  points[1].lerpVectors(rein.start, rein.end, 0.18);
  points[2].lerpVectors(rein.start, rein.end, 0.46);
  points[3].lerpVectors(rein.start, rein.end, 0.75);
  points[4].copy(rein.end);

  // Keep the reins arcing over the cart rail, yoke and the bulls' shoulders.
  points[1].y += 0.24 - sag * 0.08;
  points[2].y += 0.34 - sag * 0.34 - roadMotion;
  points[3].y += 0.2 - sag * 0.22 - roadMotion * 0.35;
  points[1].x += rein.side * 0.04;
  points[2].x += rein.side * 0.08 + lateral;
  points[3].x += lateral * 0.35;
  points[2].z += speedRatio * 0.035;
  sampleLine(rein);
}

export function updateRopeReinAnimation(
  system,
  {
    speed,
    maxSpeed,
    acceleration,
    elapsed,
    delta,
    suspensionY,
    suspensionRoll,
    suspensionPitch,
  },
) {
  if (!system) return;

  updateDriverInput(system, delta);

  const speedRatio = THREE.MathUtils.clamp(Math.abs(speed) / maxSpeed, 0, 1);
  const drivePull = THREE.MathUtils.clamp(acceleration / 1.45, 0, 1);
  const brakePull = THREE.MathUtils.clamp(-acceleration / 1.8, 0, 1);
  const bumpAmount = THREE.MathUtils.clamp(
    Math.abs(suspensionY) * 12
      + Math.abs(suspensionRoll) * 5
      + Math.abs(suspensionPitch) * 3,
    0,
    1,
  );

  const ropeTarget = 0.22 + speedRatio * 0.35 + drivePull * 0.32 + bumpAmount * 0.06;
  const reinTarget =
    0.24
    + speedRatio * 0.18
    + Math.max(drivePull, brakePull) * 0.38
    + Math.abs(system.inputAmount) * 0.13;
  system.ropeTension = damp(
    system.ropeTension,
    THREE.MathUtils.clamp(ropeTarget, 0, 1),
    5.4,
    delta,
  );
  system.reinTension = damp(
    system.reinTension,
    THREE.MathUtils.clamp(reinTarget, 0, 1),
    7,
    delta,
  );

  const armRoadMotion =
    Math.sin(elapsed * 4.8) * speedRatio * 0.009
    + suspensionY * 0.42
    + suspensionPitch * 0.32;
  system.reins.forEach((rein, index) => {
    const arm = rein.startAnchor.parent;
    arm.rotation.x = system.inputAmount * 0.075 + armRoadMotion;
    arm.rotation.z =
      (index === 0 ? -1 : 1)
      * (Math.abs(system.inputAmount) * 0.018 + suspensionRoll * 0.22);
  });

  const suspension = system.suspension;
  suspension.y = suspensionY;
  suspension.roll = suspensionRoll;
  suspension.pitch = suspensionPitch;
  const vibration = speedRatio * (0.012 + bumpAmount * 0.018);
  system.traces.forEach((trace) => {
    updateTrace(trace, system, elapsed, speedRatio, suspension, vibration);
  });
  system.reins.forEach((rein) => {
    updateRein(rein, system, elapsed, speedRatio, suspension, vibration);
  });
}

export function resetRopeReinAnimation(system) {
  if (!system) return;
  system.ropeTension = 0.22;
  system.reinTension = 0.24;
  system.inputAmount = 0;
  system.inputTarget = 0;
  system.inputHold = 0;
  system.inputDirection = "idle";
  system.driverInputState = "IDLE";
}
