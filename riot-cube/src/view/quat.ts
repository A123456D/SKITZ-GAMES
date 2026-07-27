/** Unit quaternions for cube orbit (screen-space pitch/yaw). */
export type Quat = { x: number; y: number; z: number; w: number };
export type Vec3 = { x: number; y: number; z: number };

export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function quatMul(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quatFromAxisAngle(
  ax: number,
  ay: number,
  az: number,
  angle: number,
): Quat {
  const h = angle * 0.5;
  const s = Math.sin(h);
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) };
}

/** Matches historical applyRot: R = Ry * Rx. */
export function quatFromEulerYX(rx: number, ry: number): Quat {
  return quatMul(
    quatFromAxisAngle(0, 1, 0, ry),
    quatFromAxisAngle(1, 0, 0, rx),
  );
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
}

export function quatDot(a: Quat, b: Quat): number {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

export function quatCopy(q: Quat): Quat {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

/** Rotate vector by unit quaternion. */
export function quatRotateVec(q: Quat, v: Vec3): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

/**
 * Screen-space orbit deltas.
 * dPitch > 0 = grab-up (bottom of view comes forward).
 * dYaw > 0 = grab-right (left face comes forward).
 */
export function applyScreenOrbit(q: Quat, dPitch: number, dYaw: number): Quat {
  let out = q;
  if (dPitch !== 0) {
    out = quatMul(quatFromAxisAngle(1, 0, 0, dPitch), out);
  }
  if (dYaw !== 0) {
    out = quatMul(quatFromAxisAngle(0, 1, 0, dYaw), out);
  }
  return quatNormalize(out);
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = quatDot(a, b);
  let bx = b.x;
  let by = b.y;
  let bz = b.z;
  let bw = b.w;
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    dot = -dot;
  }
  if (dot > 0.9995) {
    return quatNormalize({
      x: a.x + (bx - a.x) * t,
      y: a.y + (by - a.y) * t,
      z: a.z + (bz - a.z) * t,
      w: a.w + (bw - a.w) * t,
    });
  }
  const th = Math.acos(Math.min(1, dot));
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return {
    x: a.x * wa + bx * wb,
    y: a.y * wa + by * wb,
    z: a.z * wa + bz * wb,
    w: a.w * wa + bw * wb,
  };
}
