import { SLOT_INFO, type ListingDetails, type Slot } from "./schema";

export function safeSku(sku: string | null | undefined): string {
  const clean = (sku ?? "").trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean || "LISTING";
}

export function imageFileName(sku: string, index: number, slot: Slot): string {
  return `${safeSku(sku)}_${index + 1}_${slot}.jpg`;
}

/** Plain-text version of the listing, for the ZIP and the "Copy all" button. */
export function listingToText(d: ListingDetails, slots: Slot[] = d.shotPlan.map((s) => s.slot)): string {
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push("PRODUCT TITLE", d.title, "");
  if (d.altTitles.length) push("ALTERNATIVE TITLES", ...d.altTitles.map((t) => `- ${t}`), "");
  push("DESCRIPTION", d.description, "");

  push("MEESHO FIELDS");
  for (const f of d.fields) {
    const flag = f.verify ? "  [VERIFY]" : "";
    push(`${f.label}: ${f.value || "—"}${flag}${f.note ? `  (${f.note})` : ""}`);
  }
  push("");

  if (d.measurements.length) {
    push("MEASUREMENTS");
    for (const m of d.measurements) {
      push(`${m.name}: ${m.value ?? "—"} ${m.unit}${m.approximate ? " (approximate — verify)" : ""}`);
    }
    push("");
  }

  push("SEARCH KEYWORDS", d.keywords.join(", "), "");

  if (d.verifyBeforePublishing.length) {
    push("CHECK BEFORE PUBLISHING", ...d.verifyBeforePublishing.map((v) => `- ${v}`), "");
  }
  if (d.assumptions.length) push("ASSUMPTIONS MADE BY AI", ...d.assumptions.map((a) => `- ${a}`), "");

  push("IMAGES", ...slots.map((slot, i) => `${i + 1}. ${SLOT_INFO[slot].name}`));
  push("", "Note: AI-generated images are illustrations based on your photo. Check they match the real product.");
  return lines.join("\n");
}
