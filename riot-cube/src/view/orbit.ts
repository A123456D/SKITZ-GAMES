/**
 * Cube orbit mapping — KEEP STABLE. Change only with user confirmation + tests.
 *
 * Screen space: +dx = finger right, +dy = finger down.
 *
 * Grab-the-object (finger drags the cube with it) — drag and arrows share signs:
 *   up   (drag up / ˄)  → BOTTOM face comes forward
 *   down (drag down / ˅) → TOP face comes forward
 *   right (drag right / same as ‹ step) → LEFT
 *   left  → RIGHT
 */
import { facingFace, type FaceId } from "./cube3d";

export const ORBIT_DRAG_SENS = 0.0042;
export const SNAP_Q = Math.PI / 2;

export function applyOrbitDrag(
  rotX0: number,
  rotY0: number,
  dx: number,
  dy: number,
  sens = ORBIT_DRAG_SENS,
): { rotX: number; rotY: number } {
  // Grab-style: finger up (dy < 0) increases rotX → BOTTOM.
  // No pitch clamp — free orbit can tumble forever in any direction.
  const rotX = rotX0 - dy * sens;
  const rotY = rotY0 + dx * sens;
  return { rotX, rotY };
}

export function orbitStepDelta(
  dir: "left" | "right" | "up" | "down",
): { dRotX: number; dRotY: number } {
  if (dir === "left") return { dRotX: 0, dRotY: SNAP_Q };
  if (dir === "right") return { dRotX: 0, dRotY: -SNAP_Q };
  // Match free-drag: ˄ = tip up = BOTTOM forward
  if (dir === "up") return { dRotX: SNAP_Q, dRotY: 0 };
  return { dRotX: -SNAP_Q, dRotY: 0 };
}

/** Face reached after a full quarter-turn step from front. */
export function faceAfterOrbitStep(dir: "left" | "right" | "up" | "down"): FaceId {
  const { dRotX, dRotY } = orbitStepDelta(dir);
  return facingFace(dRotX, dRotY);
}
