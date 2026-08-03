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

const LONG_MS = 420;

export type LiftInspectOpts = {
  /** Short tap opens inspect (then onTap). Default: hold to inspect. */
  inspectOnTap?: boolean;
};

/** Hold opens inspect; short tap calls onTap. With inspectOnTap, short tap opens inspect too. */
export function bindLiftInspect(
  el: HTMLElement,
  getId: () => string | null,
  inspect: CardInspectApi,
  onTap?: () => void,
  opts?: LiftInspectOpts,
): () => void {
  let timer: number | null = null;
  let longFired = false;
  let startX = 0;
  let startY = 0;

  const clear = (): void => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const openInspect = (): void => {
    const id = getId();
    if (!id) return;
    el.classList.add("lift-armed");
    inspect.open(id);
    window.setTimeout(() => el.classList.remove("lift-armed"), 200);
  };

  const onDown = (clientX: number, clientY: number): void => {
    longFired = false;
    startX = clientX;
    startY = clientY;
    clear();
    if (opts?.inspectOnTap) return;
    timer = window.setTimeout(() => {
      timer = null;
      longFired = true;
      openInspect();
    }, LONG_MS);
  };

  const onUp = (): void => {
    const wasLong = longFired;
    clear();
    if (wasLong) return;
    if (opts?.inspectOnTap) openInspect();
    onTap?.();
  };

  const onMove = (clientX: number, clientY: number): void => {
    if (Math.hypot(clientX - startX, clientY - startY) > 12) clear();
  };

  const onPointerDown = (ev: PointerEvent): void => {
    if (ev.button != null && ev.button !== 0) return;
    onDown(ev.clientX, ev.clientY);
  };
  const onPointerUp = (): void => onUp();
  const onPointerCancel = (): void => clear();
  const onPointerMove = (ev: PointerEvent): void => onMove(ev.clientX, ev.clientY);
  const onContextMenu = (ev: Event): void => {
    if (longFired || timer != null || opts?.inspectOnTap) ev.preventDefault();
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerleave", clear);
  el.addEventListener("contextmenu", onContextMenu);

  return () => {
    clear();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerleave", clear);
    el.removeEventListener("contextmenu", onContextMenu);
  };
}
