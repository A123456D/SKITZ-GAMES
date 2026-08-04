/**
 * Hold opens inspect; short tap calls onTap.
 * With inspectOnTap, short tap opens inspect too.
 * Uses pointer capture so mobile scroll/cancel still completes the gesture.
 */
import { getCard } from "../core/cards";
import { handCardSrc } from "./cardBake";
import { cardMetaHtml } from "./cardMeta";
import { bindFoilStage } from "./foilCard";
import { CARD_SKINS_ENABLED } from "./skins";
import { hasArtLayers, setStackArtLayers } from "./cardLayers";

export type CardInspectApi = {
  open: (id: string) => void;
  close: () => void;
  isOpen: () => boolean;
};

/** Full-screen lift-inspect with foil tilt. */
export function initCardInspect(root: HTMLElement): CardInspectApi {
  const foil = root.querySelector("#inspect-foil") as HTMLElement;
  const face = root.querySelector("#inspect-face") as HTMLImageElement;
  const meta = root.querySelector("#inspect-meta") as HTMLElement;
  const closeBtn = root.querySelector("#inspect-close") as HTMLButtonElement | null;
  const backdrop = root.querySelector(".inspect-backdrop") as HTMLElement | null;

  bindFoilStage(foil);

  let openId: string | null = null;

  const close = (): void => {
    if (!openId) return;
    openId = null;
    root.hidden = true;
    root.classList.remove("is-open");
    document.body.classList.remove("inspect-open");
  };

  const open = (id: string): void => {
    const def = getCard(id);
    openId = id;
    face.src = handCardSrc(id);
    face.alt = def.name;
    const useSkin = CARD_SKINS_ENABLED && !!def.premium;
    foil.classList.toggle("is-premium", useSkin);
    const stack = foil.querySelector(".foil-stack") as HTMLElement | null;
    if (stack) {
      const layered = useSkin && hasArtLayers(id);
      foil.classList.toggle("has-layers", layered);
      setStackArtLayers(stack, layered ? id : null, { alt: def.name });
    }
    meta.innerHTML = cardMetaHtml(def);
    root.hidden = false;
    document.body.classList.add("inspect-open");
    requestAnimationFrame(() => root.classList.add("is-open"));
  };

  closeBtn?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    close();
  });
  backdrop?.addEventListener("click", () => close());
  foil.addEventListener("click", (ev) => ev.stopPropagation());
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && openId) close();
  });

  return {
    open,
    close,
    isOpen: () => openId != null,
  };
}

const LONG_MS = 380;
/** Cancel hold only on a clear drag — must stay ≥ hand DRAG_THRESHOLD */
const MOVE_CANCEL_PX = 28;

export type LiftInspectOpts = {
  /** Short tap opens inspect (then onTap). Default: hold to inspect. */
  inspectOnTap?: boolean;
  /** Fired when inspect opens (hold or tap). */
  onInspectOpen?: () => void;
};

export function bindLiftInspect(
  el: HTMLElement,
  getId: () => string | null,
  inspect: CardInspectApi,
  onTap?: () => void,
  opts?: LiftInspectOpts,
): () => void {
  let timer: number | null = null;
  let longFired = false;
  let tracking = false;
  let startX = 0;
  let startY = 0;
  let movedFar = false;
  let activePointer: number | null = null;

  const clearTimer = (): void => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const openInspect = (): void => {
    const id = getId();
    if (!id) return;
    el.classList.add("lift-armed");
    opts?.onInspectOpen?.();
    inspect.open(id);
    window.setTimeout(() => el.classList.remove("lift-armed"), 200);
  };

  const finish = (): void => {
    if (!tracking) return;
    tracking = false;
    const wasLong = longFired;
    const far = movedFar;
    clearTimer();
    activePointer = null;
    if (wasLong) return;
    if (far) return;
    if (opts?.inspectOnTap) openInspect();
    onTap?.();
  };

  const onPointerDown = (ev: PointerEvent): void => {
    if (ev.button != null && ev.button !== 0) return;
    tracking = true;
    longFired = false;
    movedFar = false;
    startX = ev.clientX;
    startY = ev.clientY;
    activePointer = ev.pointerId;
    clearTimer();
    try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    // Hold-to-inspect — forgiving so finger jitter doesn't cancel
    timer = window.setTimeout(() => {
      timer = null;
      if (!tracking || movedFar) return;
      longFired = true;
      openInspect();
    }, LONG_MS);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (!tracking) return;
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > MOVE_CANCEL_PX) {
      movedFar = true;
      clearTimer();
    }
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (activePointer != null && ev.pointerId !== activePointer) return;
    finish();
  };

  const onPointerCancel = (ev: PointerEvent): void => {
    if (activePointer != null && ev.pointerId !== activePointer) return;
    // Mobile often cancels on tiny scroll — still treat as tap if we barely moved
    finish();
  };

  const onContextMenu = (ev: Event): void => {
    if (longFired || timer != null || opts?.inspectOnTap) ev.preventDefault();
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("contextmenu", onContextMenu);

  return () => {
    clearTimer();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("contextmenu", onContextMenu);
  };
}
