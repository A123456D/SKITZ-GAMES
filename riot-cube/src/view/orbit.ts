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
 * Chevron / snap steps are screen-relative so vertical flips stay vertical
 * even after leaving the front face (avoids Euler gimbal → LEFT/RIGHT).
 */
import {
  faceTowardScreenDir,
  facingFace,
  type FaceId,
} from "./cube3d";

export const ORBIT_DRAG_SENS = 0.0042;
export const SNAP_Q = Math.PI / 2;

/** Canonical pitch/yaw pairs that put each face toward the camera. */
const FACE_ORIENTS: Record<FaceId, ReadonlyArray<{ x: number; y: number }>> = {
  0: [{ x: 0, y: 0 }], // FRONT
  1: [
    { x: SNAP_Q * 2, y: 0 },
    { x: -SNAP_Q * 2, y: 0 },
    { x: 0, y: Math.PI },
    { x: 0, y: -Math.PI },
  ], // BACK
  2: [{ x: 0, y: -SNAP_Q }], // RIGHT
  3: [{ x: 0, y: SNAP_Q }], // LEFT
  4: [{ x: -SNAP_Q, y: 0 }], // TOP
  5: [{ x: SNAP_Q, y: 0 }], // BOTTOM
};

function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Nearest canonical orientation for a face, measured from current angles. */
export function orientForFace(
  face: FaceId,
  fromX: number,
  fromY: number,
): { rotX: number; rotY: number } {
  let best = FACE_ORIENTS[face]![0]!;
  let bestCost = Infinity;
  for (const o of FACE_ORIENTS[face]!) {
    const cost =
      Math.abs(angleDelta(fromX, o.x)) + Math.abs(angleDelta(fromY, o.y));
    if (cost < bestCost) {
      bestCost = cost;
      best = o;
    }
  }
  return {
    rotX: fromX + angleDelta(fromX, best.x),
    rotY: fromY + angleDelta(fromY, best.y),
  };
}

/**
 * Which face an orbit chevron / grab-step should bring forward.
 * Grab-style vertical: ˄ pulls the bottom-of-view face forward.
 */
export function faceAfterOrbitDir(
  rotX: number,
  rotY: number,
  dir: "left" | "right" | "up" | "down",
): FaceId {
  if (dir === "up") return faceTowardScreenDir(rotX, rotY, "down");
  if (dir === "down") return faceTowardScreenDir(rotX, rotY, "up");
  if (dir === "left") return faceTowardScreenDir(rotX, rotY, "left");
  return faceTowardScreenDir(rotX, rotY, "right");
}

/** Target angles after one chevron step from the current view. */
export function orbitStepTarget(
  rotX: number,
  rotY: number,
  dir: "left" | "right" | "up" | "down",
): { rotX: number; rotY: number } {
  const face = faceAfterOrbitDir(rotX, rotY, dir);
  return orientForFace(face, rotX, rotY);
}

export function applyOrbitDrag(
  rotX0: number,
  rotY0: number,
  dx: number,
  dy: number,
  sens = ORBIT_DRAG_SENS,
): { rotX: number; rotY: number } {
  // Grab-style: finger up (dy < 0) increases rotX → BOTTOM from front.
  // Axis-lock: once the gesture is mostly vertical or horizontal, ignore the
  // other axis so a vertical flip cannot pick up yaw and snap to LEFT/RIGHT.
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  let useDx = dx;
  let useDy = dy;
  if (ax > 6 || ay > 6) {
    if (ay >= ax) useDx = 0;
    else useDy = 0;
  }
  const rotX = rotX0 - useDy * sens;
  const rotY = rotY0 + useDx * sens;
  return { rotX, rotY };
}

/** @deprecated Prefer orbitStepTarget — kept for tests of front-face deltas. */
export function orbitStepDelta(
  dir: "left" | "right" | "up" | "down",
): { dRotX: number; dRotY: number } {
  if (dir === "left") return { dRotX: 0, dRotY: SNAP_Q };
  if (dir === "right") return { dRotX: 0, dRotY: -SNAP_Q };
  if (dir === "up") return { dRotX: SNAP_Q, dRotY: 0 };
  return { dRotX: -SNAP_Q, dRotY: 0 };
}

/** Face reached after a full quarter-turn step from front. */
export function faceAfterOrbitStep(dir: "left" | "right" | "up" | "down"): FaceId {
  return faceAfterOrbitDir(0, 0, dir);
}

/** Snap free-orbit angles onto the nearest face-on orientation. */
export function snapOrbitToFace(
  rotX: number,
  rotY: number,
): { x: number; y: number } {
  const face = facingFace(rotX, rotY);
  const o = orientForFace(face, rotX, rotY);
  return { x: o.rotX, y: o.rotY };
}
