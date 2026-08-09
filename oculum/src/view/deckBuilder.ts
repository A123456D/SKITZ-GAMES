import { getCard, teachDeck, teachDeckMotley, teachDeckToll, teachDeckDusk, teachDeckBonewick } from "../core/cards";
import { catalogOrder } from "../core/catalog";
import {
  CONSTRUCTED_DECK_SIZE,
  buildAutoDeck,
  canAddToDeck,
  collectiblePool,
  countInDeck,
  maxCopiesFor,
  validateConstructedDeck,
} from "../core/construct";
import { handCardSrc } from "./cardBake";
import { cardMetaHtml } from "./cardMeta";
import type { CardInspectApi } from "./cardInspect";
import { bindLiftInspect } from "./cardInspect";
import { bindFoilStage } from "./foilCard";
import { CARD_SKINS_ENABLED } from "./skins";
import type { Heresy } from "../core/types";

const STORAGE_KEY = "oculum.constructedDeck";

export type DeckBuilderApi = {
  open: (opts?: { heresy?: Heresy }) => void;
  close: () => void;
  isOpen: () => boolean;
  getDeck: () => string[];
};

export function loadSavedDeck(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function saveDeck(deck: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

export function initDeckBuilder(opts: {
  root: HTMLElement;
  inspect: CardInspectApi;
  onBack: () => void;
  onPlay: (deck: string[]) => void;
}): DeckBuilderApi {
  const { root, inspect, onBack, onPlay } = opts;
  const poolEl = root.querySelector("#builder-pool") as HTMLElement;
  const deckEl = root.querySelector("#builder-deck") as HTMLElement;
  const countEl = root.querySelector("#builder-count") as HTMLElement;
  const issuesEl = root.querySelector("#builder-issues") as HTMLElement;
  const previewFace = root.querySelector("#builder-face") as HTMLImageElement;
  const previewFoil = root.querySelector("#builder-foil") as HTMLElement;
  const previewMeta = root.querySelector("#builder-meta") as HTMLElement;
  const filterEl = root.querySelector("#builder-filter") as HTMLSelectElement;
  const btnPlay = root.querySelector("#builder-play") as HTMLButtonElement;
  const btnSave = root.querySelector("#builder-save") as HTMLButtonElement;
  const btnClear = root.querySelector("#builder-clear") as HTMLButtonElement;
  const btnTeach = root.querySelector("#builder-teach") as HTMLButtonElement;
  const btnAuto = root.querySelector("#builder-auto") as HTMLButtonElement;
  const btnAdd = root.querySelector("#builder-add") as HTMLButtonElement;
  const btnRemove = root.querySelector("#builder-remove") as HTMLButtonElement;

  const POOL = catalogOrder(collectiblePool());
  let deck: string[] = loadSavedDeck();
  let selectedId: string = POOL[0] ?? "cliff_seeker";
  let open = false;
  let poolBuilt = false;

  bindFoilStage(previewFoil);

  const showPreview = (id: string): void => {
    selectedId = id;
    const def = getCard(id);
    previewFace.src = handCardSrc(id);
    previewFace.alt = def.name;
    previewFoil.classList.toggle("is-premium", CARD_SKINS_ENABLED && !!def.sovereign);
    previewMeta.innerHTML = cardMetaHtml(def);
    const n = countInDeck(deck, id);
    const max = maxCopiesFor(def);
    btnAdd.disabled = !canAddToDeck(deck, id) || deck.length >= CONSTRUCTED_DECK_SIZE;
    btnRemove.disabled = n <= 0;
    btnAdd.querySelector(".btn-label")!.textContent =
      n > 0 ? `Add (${n}/${max})` : `Add (0/${max})`;
    for (const el of poolEl.querySelectorAll(".builder-thumb")) {
      el.classList.toggle("active", (el as HTMLElement).dataset.id === id);
    }
  };

  const refreshStatus = (): void => {
    const v = validateConstructedDeck(deck);
    countEl.textContent = `${deck.length}/${CONSTRUCTED_DECK_SIZE}`;
    countEl.classList.toggle("ok", v.ok);
    countEl.classList.toggle("bad", deck.length !== CONSTRUCTED_DECK_SIZE);
    if (v.ok) {
      issuesEl.textContent = "Legal Constructed deck — ready to play.";
      issuesEl.className = "builder-issues ok";
    } else {
      issuesEl.textContent = v.issues.map((i) => i.message).join(" ");
      issuesEl.className = "builder-issues bad";
    }
    btnPlay.disabled = !v.ok;
    showPreview(selectedId);
  };

  const renderDeck = (): void => {
    deckEl.innerHTML = "";
    const counts = new Map<string, number>();
    for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    const order = catalogOrder([...counts.keys()]);
    for (const id of order) {
      const n = counts.get(id)!;
      const def = getCard(id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "builder-deck-chip";
      if (def.sovereign) btn.classList.add("is-premium");
      btn.dataset.id = id;
      const img = document.createElement("img");
      img.src = handCardSrc(id);
      img.alt = def.name;
      img.draggable = false;
      const badge = document.createElement("span");
      badge.className = "chip-count";
      badge.textContent = `×${n}`;
      btn.appendChild(img);
      btn.appendChild(badge);
      bindLiftInspect(
        btn,
        () => id,
        inspect,
        () => showPreview(id),
      );
      deckEl.appendChild(btn);
    }
  };

  const renderPoolCounts = (): void => {
    for (const el of poolEl.querySelectorAll<HTMLElement>(".builder-thumb")) {
      const id = el.dataset.id!;
      const n = countInDeck(deck, id);
      const badge = el.querySelector(".thumb-count") as HTMLElement;
      badge.textContent = n > 0 ? String(n) : "";
      badge.hidden = n <= 0;
      el.classList.toggle("in-deck", n > 0);
      el.classList.toggle("full", !canAddToDeck(deck, id) && n > 0);
      const def = getCard(id);
      const filter = filterEl.value;
      el.hidden = filter !== "all" && def.heresy !== filter;
    }
  };

  const buildPool = (): void => {
    if (poolBuilt) {
      renderPoolCounts();
      return;
    }
    poolEl.innerHTML = "";
    for (const id of POOL) {
      const def = getCard(id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "builder-thumb";
      if (def.sovereign) btn.classList.add("is-premium");
      btn.dataset.id = id;
      btn.title = def.name;
      const img = document.createElement("img");
      img.src = handCardSrc(id);
      img.alt = def.name;
      img.draggable = false;
      const badge = document.createElement("span");
      badge.className = "thumb-count";
      badge.hidden = true;
      btn.appendChild(img);
      btn.appendChild(badge);
      bindLiftInspect(
        btn,
        () => id,
        inspect,
        () => showPreview(id),
      );
      poolEl.appendChild(btn);
    }
    poolBuilt = true;
    renderPoolCounts();
  };

  const addSelected = (): void => {
    if (!canAddToDeck(deck, selectedId) || deck.length >= CONSTRUCTED_DECK_SIZE) return;
    deck.push(selectedId);
    renderDeck();
    renderPoolCounts();
    refreshStatus();
  };

  const removeSelected = (): void => {
    const i = deck.lastIndexOf(selectedId);
    if (i < 0) return;
    deck.splice(i, 1);
    renderDeck();
    renderPoolCounts();
    refreshStatus();
  };

  filterEl.addEventListener("change", () => renderPoolCounts());
  previewMeta.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest?.("[data-kw]") as HTMLElement | null;
    if (!btn) return;
    const id = btn.getAttribute("data-kw");
    if (!id) return;
    window.dispatchEvent(new CustomEvent("oculum-keyword", { detail: { id } }));
  });
  btnAdd.addEventListener("click", () => addSelected());
  btnRemove.addEventListener("click", () => removeSelected());
  btnSave.addEventListener("click", () => {
    saveDeck(deck);
    issuesEl.textContent = `Saved draft (${deck.length} cards).`;
    issuesEl.className = "builder-issues ok";
  });
  btnClear.addEventListener("click", () => {
    deck = [];
    renderDeck();
    renderPoolCounts();
    refreshStatus();
  });
  btnTeach.addEventListener("click", () => {
    deck = [
      ...(filterEl.value === "motley"
        ? teachDeckMotley()
        : filterEl.value === "toll"
          ? teachDeckToll()
          : filterEl.value === "deal"
            ? teachDeckDusk()
            : filterEl.value === "shell"
              ? teachDeckBonewick()
              : teachDeck()),
    ];
    renderDeck();
    renderPoolCounts();
    refreshStatus();
  });
  btnAuto.addEventListener("click", () => {
    const filter = filterEl.value;
    deck = buildAutoDeck({
      seed: Date.now(),
      heresy: filter === "all" ? "all" : (filter as Heresy),
    });
    renderDeck();
    renderPoolCounts();
    refreshStatus();
    issuesEl.textContent = "Auto-built a legal Constructed deck.";
    issuesEl.className = "builder-issues ok";
  });
  btnPlay.addEventListener("click", () => {
    const v = validateConstructedDeck(deck);
    if (!v.ok) return;
    saveDeck(deck);
    onPlay([...deck]);
  });
  root.querySelector("#builder-back")!.addEventListener("click", () => {
    open = false;
    root.hidden = true;
    onBack();
  });

  // Tap preview face to inspect
  bindLiftInspect(previewFoil, () => selectedId, inspect, () => inspect.open(selectedId));

  return {
    open: (opts?: { heresy?: Heresy }) => {
      open = true;
      root.hidden = false;
      deck = loadSavedDeck();
      if (opts?.heresy) {
        filterEl.value = opts.heresy;
        deck = [
          ...(opts.heresy === "motley"
            ? teachDeckMotley()
            : opts.heresy === "toll"
              ? teachDeckToll()
              : opts.heresy === "deal"
                ? teachDeckDusk()
                : opts.heresy === "shell"
                  ? teachDeckBonewick()
                  : teachDeck()),
        ];
      }
      buildPool();
      renderDeck();
      refreshStatus();
      showPreview(selectedId);
    },
    close: () => {
      open = false;
      root.hidden = true;
    },
    isOpen: () => open,
    getDeck: () => [...deck],
  };
}
