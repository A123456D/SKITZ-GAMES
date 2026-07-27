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

  it("pitch clamps at ±90° so a second tip does not tumble", () => {
    const pastBottom = applyOrbitDrag(SNAP_Q, 0, 0, -SNAP_Q / ORBIT_DRAG_SENS);
    expect(pastBottom.rotX).toBe(SNAP_Q);
    expect(facingFace(pastBottom.rotX, pastBottom.rotY)).toBe(5);

    const pastTop = applyOrbitDrag(-SNAP_Q, 0, 0, SNAP_Q / ORBIT_DRAG_SENS);
    expect(pastTop.rotX).toBe(-SNAP_Q);
    expect(facingFace(pastTop.rotX, pastTop.rotY)).toBe(4);
  });
});
