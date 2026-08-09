/**
 * Hold opens inspect; short tap calls onTap.
 * With inspectOnTap, short tap opens inspect too.
 * Uses pointer capture so mobile scroll/cancel still completes the gesture.
 */
import { getCard } from "../core/cards";
import { handCardSrc } from "./cardBake";
import { cardMetaHtml, liveStatusHtml } from "./cardMeta";
import { bindFoilStage } from "./foilCard";
import { CARD_SKINS_ENABLED } from "./skins";
import { hasArtLayers, setStackArtLayers } from "./cardLayers";

export type InspectExtras = {
  statusLines?: string[];
  /** Graft / charm card ids on the unit */
  grafts?: string[];
  /** Vessel inhabitant card id */
  inhabitant?: string | null;
  /** Figure / vessel hosting the charm being inspected */
  hostId?: string;
  /** Site / sigil on the same altitude */
  siteId?: string | null;
};

export type CardInspectApi = {
  open: (id: string, extras?: InspectExtras) => void;
  close: () => void;
  isOpen: () => boolean;
};

/** Full-screen lift-inspect with foil tilt. */
export function initCardInspect(root: HTMLElement): CardInspectApi {
  const foil = root.querySelector("#inspect-foil") as HTMLElement;
  const face = root.querySelector("#inspect-face") as HTMLImageElement;
  const meta = root.querySelector("#inspect-meta") as HTMLElement;
  const companions = root.querySelector("#inspect-companions") as HTMLElement | null;
  const closeBtn = root.querySelector("#inspect-close") as HTMLButtonElement | null;
  const backdrop = root.querySelector(".inspect-backdrop") as HTMLElement | null;

  bindFoilStage(foil);

  let openId: string | null = null;
  let lastExtras: InspectExtras | undefined;

  const close = (): void => {
    if (!openId) return;
    openId = null;
    lastExtras = undefined;
    root.hidden = true;
    root.classList.remove("is-open", "has-companions");
    document.body.classList.remove("inspect-open");
    if (companions) {
      companions.hidden = true;
      companions.innerHTML = "";
    }
  };

  const companionHtml = (kind: string, cardId: string): string => {
    const c = getCard(cardId);
    return `<button type="button" class="inspect-companion" data-open-card="${cardId}">
      <img class="inspect-companion-face" src="${handCardSrc(cardId)}" alt="" draggable="false" />
      <div class="inspect-companion-meta">
        <span class="inspect-companion-kicker">${kind}</span>
        ${cardMetaHtml(c)}
      </div>
    </button>`;
  };

  const open = (id: string, extras?: InspectExtras): void => {
    const def = getCard(id);
    openId = id;
    if (extras) lastExtras = extras;
    const ctx = extras ?? lastExtras;
    face.src = handCardSrc(id);
    face.alt = def.name;
    const useSkin = CARD_SKINS_ENABLED && !!def.sovereign;
    foil.classList.toggle("is-premium", useSkin);
    const stack = foil.querySelector(".foil-stack") as HTMLElement | null;
    if (stack) {
      const layered = useSkin && hasArtLayers(id);
      foil.classList.toggle("has-layers", layered);
      setStackArtLayers(stack, layered ? id : null, { alt: def.name });
    }

    const sideBits: string[] = [];
    if (ctx?.hostId && ctx.hostId !== id) {
      sideBits.push(companionHtml("Host", ctx.hostId));
    }
    if (ctx?.grafts?.length) {
      for (const gid of ctx.grafts) {
        if (gid === id) continue;
        sideBits.push(companionHtml("Charm", gid));
      }
    }
    if (ctx?.inhabitant && ctx.inhabitant !== id) {
      sideBits.push(companionHtml("Inhabitant", ctx.inhabitant));
    }
    if (ctx?.siteId && ctx.siteId !== id) {
      sideBits.push(companionHtml("Site", ctx.siteId));
    }

    if (companions) {
      if (sideBits.length) {
        companions.innerHTML = sideBits.join("");
        companions.hidden = false;
        root.classList.add("has-companions");
      } else {
        companions.innerHTML = "";
        companions.hidden = true;
        root.classList.remove("has-companions");
      }
    }

    const opened = getCard(id);
    const showStatus =
      !!ctx?.statusLines?.length &&
      (!ctx.hostId ||
        ctx.hostId === id ||
        opened.type === "site" ||
        opened.type === "sigil");
    meta.innerHTML = cardMetaHtml(def) + (showStatus ? liveStatusHtml(ctx!.statusLines!) : "");
    root.hidden = false;
    document.body.classList.add("inspect-open");
    requestAnimationFrame(() => root.classList.add("is-open"));
  };

  const onOpenCard = (ev: Event): void => {
    const t = ev.target as HTMLElement | null;
    const btn = t?.closest?.("[data-open-card]") as HTMLElement | null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const id = btn.getAttribute("data-open-card");
    if (!id) return;
    open(id, lastExtras);
  };

  meta.addEventListener("click", onOpenCard);
  companions?.addEventListener("click", onOpenCard);

  const onKeyword = (ev: Event): void => {
    const t = ev.target as HTMLElement | null;
    const btn = t?.closest?.("[data-kw]") as HTMLElement | null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const id = btn.getAttribute("data-kw");
    if (!id) return;
    window.dispatchEvent(new CustomEvent("oculum-keyword", { detail: { id } }));
  };
  meta.addEventListener("click", onKeyword);
  companions?.addEventListener("click", onKeyword);

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
  /** Custom open (board sites / live status). Default: inspect.open(id). */
  openCard?: (id: string) => void;
  /** When true, hold does not open inspect (Press / Witness / play targeting). */
  suppressHoldInspect?: () => boolean;
  /** Override hold duration (ms). */
  longMs?: number;
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
    if (opts?.openCard) opts.openCard(id);
    else inspect.open(id);
    window.setTimeout(() => el.classList.remove("lift-armed"), 200);
  };

  const finish = (): void => {
    if (!tracking) return;
    tracking = false;
    const wasLong = longFired;
    clearTimer();
    longFired = false;
    activePointer = null;
    if (wasLong || movedFar) return;
    if (opts?.inspectOnTap) {
      openInspect();
      return;
    }
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
    try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    clearTimer();
    if (opts?.suppressHoldInspect?.()) return;
    const holdFor = opts?.longMs ?? LONG_MS;
    timer = window.setTimeout(() => {
      longFired = true;
      openInspect();
    }, holdFor);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (!tracking || activePointer !== ev.pointerId) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      movedFar = true;
      clearTimer();
    }
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (activePointer != null && ev.pointerId !== activePointer) return;
    finish();
  };

  const onPointerCancel = (): void => {
    tracking = false;
    clearTimer();
    longFired = false;
    activePointer = null;
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);

  return () => {
    clearTimer();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
  };
}
