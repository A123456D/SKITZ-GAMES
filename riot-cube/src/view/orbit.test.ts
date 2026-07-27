import { describe, expect, it } from "vitest";
import { facingFace } from "./cube3d";
import {
  applyOrbitDrag,
  faceAfterOrbitStep,
  ORBIT_DRAG_SENS,
  SNAP_Q,
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
});
