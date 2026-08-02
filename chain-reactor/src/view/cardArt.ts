import type { CardDef } from "../core/types";
import { getCard } from "../core/cards";

/** Map each card id → transparent PNG under /assets/cards/ */
export const CARD_ART: Record<string, string> = {
  n_pulse_n: "signal-spike.png",
  n_pulse_cross: "pulse-reactor.png",
  n_pulse_side: "lateral-ping.png",
  n_amp: "amplifier-lens.png",

  v_swarm1: "card-spark-drone.png",
  v_swarm2: "volt-swarm.png",
  v_swarm3: "volt-swarm.png",
  v_edge: "pulse-reactor.png",
  v_split1: "splitter-fork.png",
  v_split2: "splitter-fork.png",
  v_storm: "splitter-fork.png",
  p_vector: "reflector-prism.png",
  o_invert: "card-dark-seed.png",

  p_center1: "prism-lattice.png",
  p_center2: "prism-lattice.png",
  p_reflect1: "reflector-prism.png",
  p_reflect2: "reflector-prism.png",
  p_amp1: "amplifier-lens.png",
  p_amp2: "amplifier-lens.png",
  p_wall: "card-hard-light.png",

  o_late1: "card-dark-seed.png",
  o_late2: "void-singularity.png",
  o_nuke1: "void-nuke.png",
  o_nuke2: "void-nuke.png",
  o_siphon: "card-drain-lattice.png",
  o_heavy: "card-void-pillar.png",
  o_split: "splitter-fork.png",
};

const cache = new Map<string, HTMLImageElement>();
let loadPromise: Promise<void> | null = null;

export function artUrlFor(defId: string): string {
  const file = CARD_ART[defId] ?? artFallback(getCard(defId));
  return `./assets/cards/${file}`;
}

function artFallback(def: CardDef): string {
  switch (def.node) {
    case "splitter":
      return "splitter-fork.png";
    case "reflector":
    case "inverter":
      return "reflector-prism.png";
    case "amplifier":
      return "amplifier-lens.png";
    default:
      if (def.faction === "void") return "void-singularity.png";
      if (def.faction === "prismatic") return "prism-lattice.png";
      return "pulse-reactor.png";
  }
}

export function preloadCardArt(): Promise<void> {
  if (loadPromise) return loadPromise;
  const files = [...new Set(Object.values(CARD_ART))];
  loadPromise = Promise.all(
    files.map(
      (file) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            cache.set(file, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `./assets/cards/${file}`;
        }),
    ),
  ).then(() => undefined);
  return loadPromise;
}

export function getCardArt(defId: string): HTMLImageElement | null {
  const file = CARD_ART[defId] ?? artFallback(getCard(defId));
  return cache.get(file) ?? null;
}
