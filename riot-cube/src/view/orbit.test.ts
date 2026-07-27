import { describe, expect, it } from "vitest";
import { facingFace, facingFaceQuat } from "./cube3d";
import {
  applyOrbitDragQuat,
  faceAfterOrbitStep,
  orbitStepQuat,
  ORBIT_DRAG_SENS,
  SNAP_Q,
  snapOrbitQuat,
  quatFromEulerYX,
} from "./orbit";
import { applyScreenOrbit, quatIdentity } from "./quat";

describe("orbit mapping (do not flip casually)", () => {
  it("vertical: up → BOTTOM, down → TOP (grab-style, drag matches ˄˅)", () => {
    expect(faceAfterOrbitStep("up")).toBe(5); // BOTTOM
    expect(faceAfterOrbitStep("down")).toBe(4); // TOP

    const up = applyOrbitDragQuat(
      quatIdentity(),
      0,
      -SNAP_Q / ORBIT_DRAG_SENS,
    );
    expect(facingFaceQuat(up)).toBe(5);

    const down = applyOrbitDragQuat(
      quatIdentity(),
      0,
      SNAP_Q / ORBIT_DRAG_SENS,
    );
    expect(facingFaceQuat(down)).toBe(4);
  });

  it("‹ reaches LEFT; › reaches RIGHT", () => {
    expect(faceAfterOrbitStep("left")).toBe(3);
    expect(faceAfterOrbitStep("right")).toBe(2);
  });

  it("free-drag yaw shares button signs", () => {
    const right = applyOrbitDragQuat(
      quatIdentity(),
      SNAP_Q / ORBIT_DRAG_SENS,
      0,
    );
    expect(facingFaceQuat(right)).toBe(3);

    const left = applyOrbitDragQuat(
      quatIdentity(),
      -SNAP_Q / ORBIT_DRAG_SENS,
      0,
    );
    expect(facingFaceQuat(left)).toBe(2);
  });

  it("from LEFT, ˄ flips to BOTTOM (not spin staying LEFT)", () => {
    const left = quatFromEulerYX(0, SNAP_Q);
    expect(facingFaceQuat(left)).toBe(3); // LEFT
    const up = orbitStepQuat(left, "up");
    expect(facingFaceQuat(up)).toBe(5); // BOTTOM
  });

  it("from LEFT, vertical-only drag pitches to BOTTOM/TOP (not roll on LEFT)", () => {
    const left = quatFromEulerYX(0, SNAP_Q);
    const dragUp = applyOrbitDragQuat(
      left,
      0,
      -SNAP_Q / ORBIT_DRAG_SENS,
    );
    const face = facingFaceQuat(dragUp);
    expect(face === 5 || face === 4).toBe(true);
    expect(face).not.toBe(3);

    const dragDown = applyOrbitDragQuat(
      left,
      0,
      SNAP_Q / ORBIT_DRAG_SENS,
    );
    const faceDown = facingFaceQuat(dragDown);
    expect(faceDown === 4 || faceDown === 5).toBe(true);
    expect(faceDown).not.toBe(3);
  });

  it("quarter-turn steps keep flipping around the vertical loop", () => {
    let q = quatIdentity();
    q = orbitStepQuat(q, "up");
    expect(facingFaceQuat(q)).toBe(5); // BOTTOM
    q = orbitStepQuat(q, "up");
    expect(facingFaceQuat(q)).toBe(1); // BACK
    q = orbitStepQuat(q, "up");
    expect(facingFaceQuat(q)).toBe(4); // TOP
    q = orbitStepQuat(q, "up");
    expect(facingFaceQuat(q)).toBe(0); // FRONT

    // Euler wrappers still match historical facing at identity pitch steps
    expect(facingFace(SNAP_Q, 0)).toBe(5);
    expect(facingFace(SNAP_Q * 2, 0)).toBe(1);
    expect(facingFace(SNAP_Q * 3, 0)).toBe(4);
    expect(facingFace(SNAP_Q * 4, 0)).toBe(0);
  });

  it("from BOTTOM, ˄ continues vertically to BACK (not LEFT/RIGHT)", () => {
    const bottom = orbitStepQuat(quatIdentity(), "up");
    expect(facingFaceQuat(bottom)).toBe(5);
    const up = orbitStepQuat(bottom, "up");
    expect(facingFaceQuat(up)).toBe(1);
    const down = orbitStepQuat(bottom, "down");
    expect(facingFaceQuat(down)).toBe(0);
  });

  it("snap picks nearest of 24 (near BOTTOM with stray yaw → BOTTOM)", () => {
    const nearBottom = applyScreenOrbit(
      quatFromEulerYX(SNAP_Q, 0),
      0,
      0.2,
    );
    const snapped = snapOrbitQuat(nearBottom);
    expect(facingFaceQuat(snapped)).toBe(5);
  });

  it("vertical drag axis-locks away stray yaw", () => {
    const drag = applyOrbitDragQuat(
      quatIdentity(),
      40,
      -SNAP_Q / ORBIT_DRAG_SENS,
    );
    // Pure pitch: after snap of a pure-pitch result, facing BOTTOM; no LEFT/RIGHT
    expect(facingFaceQuat(drag)).toBe(5);
    expect(facingFaceQuat(snapOrbitQuat(drag))).toBe(5);
  });
});
