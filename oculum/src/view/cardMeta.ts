import type { CardDef } from "../core/types";

/** Shared Codex / inspect / builder meta block. */
export function cardMetaHtml(def: CardDef): string {
  const wit =
    def.witnessCost > 0
      ? ` · Witness ${def.witnessCost} Sight`
      : def.type === "site"
        ? " · Enters Witnessed"
        : "";
  const combat =
    def.type === "figure" || def.type === "vessel"
      ? `<p class="line">Veiled ${def.veiledPower} · Witnessed ${def.witnessedPower}${
          def.sightYield > 0 ? ` · Sight/turn ${def.sightYield}` : ""
        }</p>`
      : def.sightYield > 0
        ? `<p class="line">Sight/turn ${def.sightYield}</p>`
        : def.type === "relic" && def.witnessedPower > 0
          ? `<p class="line">Host Witnessed +${def.witnessedPower} power</p>`
          : "";
  const rare = def.premium ? `<p class="line rare">PREMIUM</p>` : "";
  return `
    <p class="name">${def.name}</p>
    <p class="line">${def.school.toUpperCase()} · ${def.type.toUpperCase()} · ${def.essence} Essence${wit}</p>
    ${rare}
    ${combat}
    <p class="rules">${def.text}</p>
  `;
}
