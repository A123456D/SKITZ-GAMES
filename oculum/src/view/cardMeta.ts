import type { CardDef } from "../core/types";
import { heresyShort } from "../core/heresies";

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
  const rare = def.sovereign ? `<p class="line rare">SOVEREIGN</p>` : "";
  const structured =
    (def.type === "figure" || def.type === "vessel") && (def.veiledAbility || def.revelation);
  const rulesBlock = structured
    ? `${
        def.veiledAbility
          ? `<p class="rules rules-veiled"><span class="rules-kicker">Veiled</span> ${def.veiledAbility}</p>`
          : ""
      }${
        def.revelation
          ? `<p class="rules rules-rev"><span class="rules-kicker">Revelation</span> ${def.revelation}</p>`
          : ""
      }${
        def.sightYield > 0
          ? `<p class="rules rules-wit"><span class="rules-kicker">While Witnessed</span> +${def.sightYield} Sight/turn.</p>`
          : ""
      }`
    : `<p class="rules">${def.text}</p>`;
  return `
    <p class="name">${def.name}</p>
    <p class="line">${heresyShort(def.heresy).toUpperCase()} · ${def.type.toUpperCase()} · ${def.essence} Essence${wit}</p>
    ${rare}
    ${combat}
    ${rulesBlock}
  `;
}

/** Live board status line for inspect (Veiled / Stain / grafts…). */
export function liveStatusHtml(lines: string[]): string {
  if (!lines.length) return "";
  return `<p class="line live-status">${lines.join(" · ")}</p>`;
}
