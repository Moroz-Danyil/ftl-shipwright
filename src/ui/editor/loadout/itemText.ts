/** Short stats and detail rows of weapons, drones and augments, with their units. */
import type { CatalogItem } from "../../../app/loadout/catalog";
import type { Texts } from "../../../text";

/** The line under a card's title. */
export function statsLine(texts: Texts, item: CatalogItem): string {
  const s = texts.loadout.stats;
  const parts: string[] = [];
  if (item.kind === "weapon") {
    const w = item.entry;
    if (w.damage) parts.push(s.damage(w.damage));
    if (w.shots && w.shots > 1) parts.push(s.shots(w.shots));
    if (w.missiles) parts.push(s.missiles(w.missiles));
    if (w.power) parts.push(s.power(w.power));
  } else if (item.kind === "drone") {
    if (item.entry.power) parts.push(s.power(item.entry.power));
    if (item.entry.cost) parts.push(s.cost(item.entry.cost));
  } else {
    if (item.entry.cost) parts.push(s.cost(item.entry.cost));
    if (item.entry.stackable) parts.push(s.stackable);
  }
  return parts.join(" · ");
}

/** Every stat of an item as label and value, for the details area. */
export function detailRows(texts: Texts, item: CatalogItem): Array<[string, string]> {
  const d = texts.loadout.details;
  const u = texts.loadout.units;
  const rows: Array<[string, string | undefined]> = [];
  if (item.kind === "weapon") {
    const w = item.entry;
    rows.push(
      [d.type, w.type],
      [d.damage, w.damage?.toString()],
      [d.shots, w.shots?.toString()],
      [d.sp, w.sp?.toString()],
      [d.fireChance, w.fireChance !== undefined ? u.percent(w.fireChance) : undefined],
      [d.breachChance, w.breachChance !== undefined ? u.percent(w.breachChance) : undefined],
      [d.stunChance, w.stunChance !== undefined ? u.percent(w.stunChance) : undefined],
      [d.ion, w.ion?.toString()],
      [d.persDamage, w.persDamage?.toString()],
      [d.sysDamage, w.sysDamage?.toString()],
      [d.cooldown, w.cooldown !== undefined ? u.seconds(w.cooldown) : undefined],
      [d.missiles, w.missiles?.toString()],
      [d.power, w.power?.toString()],
      [d.cost, w.cost !== undefined ? u.scrap(w.cost) : undefined]
    );
  } else if (item.kind === "drone") {
    const e = item.entry;
    rows.push(
      [d.type, e.type],
      [d.power, e.power?.toString()],
      [d.cost, e.cost !== undefined ? u.scrap(e.cost) : undefined]
    );
  } else {
    const a = item.entry;
    rows.push(
      [d.value, a.value?.toString()],
      [d.cost, a.cost !== undefined ? u.scrap(a.cost) : undefined]
    );
  }
  return rows.filter((r): r is [string, string] => r[1] !== undefined && r[1] !== "");
}
