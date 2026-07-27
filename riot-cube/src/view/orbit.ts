/**
 * Cube orbit mapping — KEEP STABLE. Change only with user confirmation + tests.
 *
 * Screen space: +dx = finger right, +dy = finger down.
 *
 * Grab-the-object (finger drags the cube with it) — drag and arrows share signs:
 *   up   (drag up / ˄)  → face at bottom of view comes forward
 *   down (drag down / ˅) → face at top of view comes forward
 *   right (drag right) → LEFT  (‹ button)
 *   left  (drag left)  → RIGHT (› button)
 *
 * Screen-space quaternion orbit so vertical flips stay vertical
 * even after leaving the front face (avoids Euler gimbal → LEFT/RIGHT).
 */
import type { FaceId } from "../core/rubik";
import {
  type Quat,
  applyScreenOrbit,
  quatCopy,
  quatDot,
  quatFromAxisAngle,
  quatFromEulerYX,
  quatIdentity,
  quatMul,
  quatNormalize,
  quatRotateVec,
} from "./quat";

export {
  applyScreenOrbit,
  quatFromEulerYX,
  type Quat,
} from "./quat";

export const ORBIT_DRAG_SENS = 0.0042;
export const SNAP_Q = Math.PI / 2;

/** Face normals — same as cube3d FACES. */
const FACE_NORMALS: ReadonlyArray<{ x: number; y: number; z: number }> = [
  { x: 0, y: 0, z: 1 }, // FRONT
  { x: 0, y: 0, z: -1 }, // BACK
  { x: 1, y: 0, z: 0 }, // RIGHT
  { x: -1, y: 0, z: 0 }, // LEFT
  { x: 0, y: -1, z: 0 }, // TOP
  { x: 0, y: 1, z: 0 }, // BOTTOM
];

/** Base euler YX orientations for each of the 6 faces. */
const FACE_BASE: ReadonlyArray<[number, number]> = [
  [0, 0], // FRONT
  [Math.PI, 0], // BACK
  [0, -SNAP_Q], // RIGHT
  [0, SNAP_Q], // LEFT
  [-SNAP_Q, 0], // TOP
  [SNAP_Q, 0], // BOTTOM
];

/** 24 cube orientations = 6 faces × 4 in-plane rolls (Rz * eulerYX). */
function buildCanonicalSnaps(): Quat[] {
  const snaps: Quat[] = [];
  for (const [rx, ry] of FACE_BASE) {
    const base = quatFromEulerYX(rx, ry);
    for (let k = 0; k < 4; k++) {
      const roll = quatFromAxisAngle(0, 0, 1, k * SNAP_Q);
      snaps.push(quatNormalize(quatMul(roll, base)));
    }
  }
  return snaps;
}

const SNAP_ORIENTS = buildCanonicalSnaps();

export function facingFaceQuat(q: Quat): FaceId {
  let best: FaceId = 0;
  let bestZ = -Infinity;
  for (let i = 0; i < 6; i++) {
    const n = quatRotateVec(q, FACE_NORMALS[i]!);
    if (n.z > bestZ) {
      bestZ = n.z;
      best = i as FaceId;
    }
  }
  return best;
}

/**
 * Which cube face points most toward a screen direction
 * (left/right/up/down in canvas space, +Y down).
 */
export function faceTowardScreenDir(
  q: Quat,
  dir: "left" | "right" | "up" | "down",
): FaceId {
  const target =
    dir === "left"
      ? { x: -1, y: 0 }
      : dir === "right"
        ? { x: 1, y: 0 }
        : dir === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
  let best: FaceId = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < 6; i++) {
    const n = quatRotateVec(q, FACE_NORMALS[i]!);
    const xy = Math.hypot(n.x, n.y) || 1;
    const nx = n.x / xy;
    const ny = n.y / xy;
    const dot = nx * target.x + ny * target.y;
    const score = dot - Math.max(0, n.z) * 0.15;
    if (score > bestDot) {
      bestDot = score;
      best = i as FaceId;
    }
  }
  return best;
}

/**
 * Which face an orbit chevron / grab-step should bring forward.
 * Grab-style vertical: ˄ pulls the bottom-of-view face forward.
 */
export function faceAfterOrbitDir(
  q: Quat,
  dir: "left" | "right" | "up" | "down",
): FaceId {
  if (dir === "up") return faceTowardScreenDir(q, "down");
  if (dir === "down") return faceTowardScreenDir(q, "up");
  if (dir === "left") return faceTowardScreenDir(q, "left");
  return faceTowardScreenDir(q, "right");
}

/** Snap free-orbit quaternion onto the nearest of 24 cube orientations. */
export function snapOrbitQuat(q: Quat): Quat {
  let best = SNAP_ORIENTS[0]!;
  let bestAbs = -1;
  for (const s of SNAP_ORIENTS) {
    const d = Math.abs(quatDot(q, s));
    if (d > bestAbs) {
      bestAbs = d;
      best = s;
    }
  }
  if (quatDot(q, best) < 0) {
    return { x: -best.x, y: -best.y, z: -best.z, w: -best.w };
  }
  return quatCopy(best);
}

export function applyOrbitDragQuat(
  q0: Quat,
  dx: number,
  dy: number,
  sens = ORBIT_DRAG_SENS,
): Quat {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let useDx = dx;
  let useDy = dy;
  if (ax > 6 || ay > 6) {
    if (ay >= ax) useDx = 0;
    else useDy = 0;
  }
  const dPitch = -useDy * sens;
  const dYaw = useDx * sens;
  return applyScreenOrbit(q0, dPitch, dYaw);
}

export function orbitStepQuat(
  q: Quat,
  dir: "left" | "right" | "up" | "down",
): Quat {
  let next: Quat;
  if (dir === "up") next = applyScreenOrbit(q, SNAP_Q, 0);
  else if (dir === "down") next = applyScreenOrbit(q, -SNAP_Q, 0);
  else if (dir === "left") next = applyScreenOrbit(q, 0, SNAP_Q);
  else next = applyScreenOrbit(q, 0, -SNAP_Q);
  return snapOrbitQuat(next);
}

/** Face reached after a full quarter-turn step from front (identity). */
export function faceAfterOrbitStep(
  dir: "left" | "right" | "up" | "down",
): FaceId {
  return facingFaceQuat(orbitStepQuat(quatIdentity(), dir));
}

/** Euler-compat drag wrapper (euler → quat → facing via euler rebuild). */
export function applyOrbitDrag(
  rotX0: number,
  rotY0: number,
  dx: number,
  dy: number,
  sens = ORBIT_DRAG_SENS,
): Quat {
  return applyOrbitDragQuat(quatFromEulerYX(rotX0, rotY0), dx, dy, sens);
}
