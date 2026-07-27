import { describe, expect, it } from "vitest";
import { facingFace } from "./cube3d";
import {
  applyOrbitDrag,
  faceAfterOrbitDir,
  faceAfterOrbitStep,
  orbitStepTarget,
  ORBIT_DRAG_SENS,
  SNAP_Q,
  snapOrbitToFace,
} from "./orbit";

describe("orbit mapping (do not flip casually)", () => {
  it("vertical: up → BOTTOM, down → TOP (grab-style, drag matches ˄˅)", () => {
    expect(faceAfterOrbitStep("up")).toBe(5); // BOTTOM
    expect(faceAfterOrbitStep("down")).toBe(4); // TOP

    const up = applyOrbitDrag(0, 0, 0, -SNAP_Q / ORBIT_DRAG_SENS);
    expect(facingFace(up.rotX, up.rotY)).toBe(5);

    const down = applyOrbitDrag(0, 0, 0, SNAP_Q / ORBIT_DRAG_SENS);
    expect(facingFace(down.rotX, down.rotY)).toBe(4);
  });

  it("‹ reaches LEFT; › reaches RIGHT", () => {
    expect(faceAfterOrbitStep("left")).toBe(3);
    expect(faceAfterOrbitStep("right")).toBe(2);
  });

  it("free-drag yaw shares button signs", () => {
    const right = applyOrbitDrag(0, 0, SNAP_Q / ORBIT_DRAG_SENS, 0);
    expect(facingFace(right.rotX, right.rotY)).toBe(3);

    const left = applyOrbitDrag(0, 0, -SNAP_Q / ORBIT_DRAG_SENS, 0);
    expect(facingFace(left.rotX, left.rotY)).toBe(2);
  });

  it("pitch can tumble past ±90° for infinite vertical flips", () => {
    const pastBottom = applyOrbitDrag(SNAP_Q, 0, 0, -SNAP_Q / ORBIT_DRAG_SENS);
    expect(pastBottom.rotX).toBeCloseTo(SNAP_Q * 2, 5);
    expect(facingFace(pastBottom.rotX, pastBottom.rotY)).toBe(1); // BACK

    const pastTop = applyOrbitDrag(-SNAP_Q, 0, 0, SNAP_Q / ORBIT_DRAG_SENS);
    expect(pastTop.rotX).toBeCloseTo(-SNAP_Q * 2, 5);
    expect(facingFace(pastTop.rotX, pastTop.rotY)).toBe(1); // BACK
  });

  it("quarter-turn steps keep flipping around the vertical loop", () => {
    expect(facingFace(SNAP_Q, 0)).toBe(5); // BOTTOM
    expect(facingFace(SNAP_Q * 2, 0)).toBe(1); // BACK
    expect(facingFace(SNAP_Q * 3, 0)).toBe(4); // TOP
    expect(facingFace(SNAP_Q * 4, 0)).toBe(0); // FRONT
  });

  it("from BOTTOM, ˄ continues vertically to BACK (not LEFT/RIGHT)", () => {
    expect(faceAfterOrbitDir(SNAP_Q, 0, "up")).toBe(1); // BACK
    expect(faceAfterOrbitDir(SNAP_Q, 0, "down")).toBe(0); // FRONT
    const up = orbitStepTarget(SNAP_Q, 0, "up");
    expect(facingFace(up.rotX, up.rotY)).toBe(1);
    expect(Math.abs(up.rotY)).toBeLessThan(0.01);
  });

  it("from LEFT, ˄˅ flip vertically to BOTTOM/TOP", () => {
    expect(faceAfterOrbitDir(0, SNAP_Q, "up")).toBe(5); // BOTTOM
    expect(faceAfterOrbitDir(0, SNAP_Q, "down")).toBe(4); // TOP
    const up = orbitStepTarget(0, SNAP_Q, "up");
    expect(facingFace(up.rotX, up.rotY)).toBe(5);
  });

  it("snap never parks on gimbal LEFT while pitching through BOTTOM", () => {
    // Near BOTTOM with a little yaw — old independent qx/qy snap became LEFT.
    const snapped = snapOrbitToFace(SNAP_Q, 0.2);
    expect(facingFace(snapped.x, snapped.y)).toBe(5);
    expect(Math.abs(snapped.y)).toBeLessThan(0.01);
  });

  it("vertical drag axis-locks away stray yaw", () => {
    const drag = applyOrbitDrag(0, 0, 40, -SNAP_Q / ORBIT_DRAG_SENS);
    expect(Math.abs(drag.rotY)).toBeLessThan(0.001);
    expect(facingFace(drag.rotX, drag.rotY)).toBe(5);
  });
});
