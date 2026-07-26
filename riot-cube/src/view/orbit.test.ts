import { describe, expect, it } from "vitest";
import { facingFace } from "./cube3d";
import {
  applyOrbitDrag,
  faceAfterOrbitStep,
  ORBIT_DRAG_SENS,
  SNAP_Q,
} from "./orbit";

describe("orbit mapping (do not flip casually)", () => {
  it("˄ / drag-up reach TOP; ˅ / drag-down reach BOTTOM", () => {
    expect(faceAfterOrbitStep("up")).toBe(4); // TOP
    expect(faceAfterOrbitStep("down")).toBe(5); // BOTTOM

    const up = applyOrbitDrag(0, 0, 0, -SNAP_Q / ORBIT_DRAG_SENS);
    expect(facingFace(up.rotX, up.rotY)).toBe(4);

    const down = applyOrbitDrag(0, 0, 0, SNAP_Q / ORBIT_DRAG_SENS);
    expect(facingFace(down.rotX, down.rotY)).toBe(5);
  });

  it("‹ reaches LEFT; › reaches RIGHT", () => {
    expect(faceAfterOrbitStep("left")).toBe(3); // LEFT
    expect(faceAfterOrbitStep("right")).toBe(2); // RIGHT
  });

  it("free-drag yaw shares button signs", () => {
    const right = applyOrbitDrag(0, 0, SNAP_Q / ORBIT_DRAG_SENS, 0);
    expect(facingFace(right.rotX, right.rotY)).toBe(3); // LEFT (‹)

    const left = applyOrbitDrag(0, 0, -SNAP_Q / ORBIT_DRAG_SENS, 0);
    expect(facingFace(left.rotX, left.rotY)).toBe(2); // RIGHT (›)
  });
});
