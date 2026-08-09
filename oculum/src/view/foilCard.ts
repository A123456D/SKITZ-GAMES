/** Card tilt for all cards. Foil / layered skins gated via CARD_SKINS_ENABLED. */

import { CARD_SKINS_ENABLED } from "./skins";

export type FoilHandle = {
  root: HTMLElement;
  stack: HTMLElement;
  destroy: () => void;
};

function setFoilVars(el: HTMLElement, nx: number, ny: number): void {
  const skins = CARD_SKINS_ENABLED && el.classList.contains("is-premium");
  const layered = CARD_SKINS_ENABLED && el.classList.contains("has-layers");
  const amp = skins ? 1.7 : 1;
  const rx = (ny - 0.5) * -14 * amp;
  const ry = (nx - 0.5) * 18 * amp;
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const px = skins && !layered ? dx * 14 : 0;
  const py = skins && !layered ? dy * 11 : 0;
  const z = skins ? 36 : 0;
  const sx = skins ? dx * -18 : dx * -6;
  const sy = skins ? 14 + dy * 10 : 8;
  const l0x = layered ? dx * -10 : 0;
  const l0y = layered ? dy * -8 : 0;
  const l1x = layered ? dx * 16 : 0;
  const l1y = layered ? dy * 12 : 0;
  const l2x = layered ? dx * 28 : 0;
  const l2y = layered ? dy * 22 : 0;

  el.style.setProperty("--foil-rx", `${rx.toFixed(2)}deg`);
  el.style.setProperty("--foil-ry", `${ry.toFixed(2)}deg`);
  el.style.setProperty("--foil-x", `${(nx * 100).toFixed(1)}%`);
  el.style.setProperty("--foil-y", `${(ny * 100).toFixed(1)}%`);
  el.style.setProperty("--foil-op", skins ? "0.62" : "0");
  el.style.setProperty("--foil-z", `${z.toFixed(1)}px`);
  el.style.setProperty("--foil-px", `${px.toFixed(1)}px`);
  el.style.setProperty("--foil-py", `${py.toFixed(1)}px`);
  el.style.setProperty("--foil-sx", `${sx.toFixed(1)}px`);
  el.style.setProperty("--foil-sy", `${sy.toFixed(1)}px`);
  el.style.setProperty("--foil-scale", skins ? "1.03" : "1");
  el.style.setProperty("--layer-bg-x", `${l0x.toFixed(1)}px`);
  el.style.setProperty("--layer-bg-y", `${l0y.toFixed(1)}px`);
  el.style.setProperty("--layer-mid-x", `${l1x.toFixed(1)}px`);
  el.style.setProperty("--layer-mid-y", `${l1y.toFixed(1)}px`);
  el.style.setProperty("--layer-fx-x", `${l2x.toFixed(1)}px`);
  el.style.setProperty("--layer-fx-y", `${l2y.toFixed(1)}px`);
}

function resetFoilVars(el: HTMLElement): void {
  const skins = CARD_SKINS_ENABLED && el.classList.contains("is-premium");
  el.style.setProperty("--foil-rx", "0deg");
  el.style.setProperty("--foil-ry", "0deg");
  el.style.setProperty("--foil-x", "50%");
  el.style.setProperty("--foil-y", "45%");
  el.style.setProperty("--foil-op", "0");
  el.style.setProperty("--foil-z", skins ? "18px" : "0px");
  el.style.setProperty("--foil-px", "0px");
  el.style.setProperty("--foil-py", "0px");
  el.style.setProperty("--foil-sx", "0px");
  el.style.setProperty("--foil-sy", "8px");
  el.style.setProperty("--foil-scale", "1");
  el.style.setProperty("--layer-bg-x", "0px");
  el.style.setProperty("--layer-bg-y", "0px");
  el.style.setProperty("--layer-mid-x", "0px");
  el.style.setProperty("--layer-mid-y", "0px");
  el.style.setProperty("--layer-fx-x", "0px");
  el.style.setProperty("--layer-fx-y", "0px");
}

/** Bind tilt listeners to an existing `.foil-card` stage (e.g. Codex). */
export function bindFoilStage(root: HTMLElement): () => void {
  const onMove = (clientX: number, clientY: number): void => {
    const r = root.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const nx = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    setFoilVars(root, nx, ny);
  };

  const onPointerMove = (ev: PointerEvent): void => onMove(ev.clientX, ev.clientY);
  const onPointerLeave = (): void => resetFoilVars(root);
  const onTouchMove = (ev: TouchEvent): void => {
    const t = ev.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  };

  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", onPointerLeave);
  root.addEventListener("touchmove", onTouchMove, { passive: true });
  resetFoilVars(root);

  return () => {
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerleave", onPointerLeave);
    root.removeEventListener("touchmove", onTouchMove);
  };
}

function ensureStack(root: HTMLElement, face: HTMLElement): HTMLElement {
  let stack = root.querySelector(".foil-stack") as HTMLElement | null;
  if (stack) {
    if (!face.parentElement?.classList.contains("foil-stack")) {
      const sheen = stack.querySelector(".foil-sheen");
      if (sheen) stack.insertBefore(face, sheen);
      else stack.appendChild(face);
      face.classList.add("foil-face");
    }
    return stack;
  }
  stack = document.createElement("div");
  stack.className = "foil-stack";
  root.insertBefore(stack, face);
  stack.appendChild(face);
  face.classList.add("foil-face");

  const sheen = document.createElement("div");
  sheen.className = "foil-sheen";
  sheen.setAttribute("aria-hidden", "true");
  stack.appendChild(sheen);

  const glare = document.createElement("div");
  glare.className = "foil-glare";
  glare.setAttribute("aria-hidden", "true");
  stack.appendChild(glare);

  return stack;
}

/** Wrap an <img> in a tiltable stage. */
export function mountFoilCard(
  face: HTMLElement,
  opts?: { sovereign?: boolean; premium?: boolean },
): FoilHandle {
  const root = document.createElement("div");
  root.className = "foil-card foil-card--hand";
  if (CARD_SKINS_ENABLED && (opts?.sovereign || opts?.premium)) root.classList.add("is-premium");
  const parent = face.parentElement;
  if (!parent) throw new Error("foil face needs a parent");
  parent.insertBefore(root, face);
  root.appendChild(face);
  const stack = ensureStack(root, face);

  const unbind = bindFoilStage(root);
  return {
    root,
    stack,
    destroy: () => {
      unbind();
      parent.insertBefore(face, root);
      face.classList.remove("foil-face");
      face.hidden = false;
      root.remove();
    },
  };
}
