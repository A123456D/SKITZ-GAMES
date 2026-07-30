export type Punch = {
  x: number;
  y: number;
  t: number;
  life: number;
};

export type Flash = {
  id: string;
  t: number;
  life: number;
};

let punches: Punch[] = [];
let flashes: Flash[] = [];
let shake = 0;

export function punchAt(x: number, y: number): void {
  punches.push({ x, y, t: 0, life: 0.35 });
}

export function flashDaemon(id: string): void {
  flashes.push({ id, t: 0, life: 0.55 });
}

export function bumpShake(amount = 6): void {
  shake = Math.max(shake, amount);
}

export function updateMotion(dt: number): void {
  punches = punches
    .map((p) => ({ ...p, t: p.t + dt }))
    .filter((p) => p.t < p.life);
  flashes = flashes
    .map((f) => ({ ...f, t: f.t + dt }))
    .filter((f) => f.t < f.life);
  shake = Math.max(0, shake - dt * 28);
}

export function getPunches(): readonly Punch[] {
  return punches;
}

export function getFlashes(): readonly Flash[] {
  return flashes;
}

export function getShake(): number {
  return shake;
}

export function clearMotion(): void {
  punches = [];
  flashes = [];
  shake = 0;
}
