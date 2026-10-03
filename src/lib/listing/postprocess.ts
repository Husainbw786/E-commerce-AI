import { SLOTS, type ListingDetails, type ListingField, type ShotPlanItem } from "./schema";

export const DESCRIPTION_MAX = 1400;

/** Fields the AI must never invent. Value is kept only when it was read off the photo. */
const SUPPLIER_FIELDS: Array<{ key: string; label: string }> = [
  { key: "manufacturer_name", label: "Manufacturer Name" },
  { key: "manufacturer_address", label: "Manufacturer Address" },
  { key: "manufacturer_pincode", label: "Manufacturer Pincode" },
  { key: "packer_name", label: "Packer Name" },
  { key: "packer_address", label: "Packer Address" },
  { key: "packer_pincode", label: "Packer Pincode" },
  { key: "importer_name", label: "Importer Name" },
  { key: "importer_address", label: "Importer Address" },
  { key: "importer_pincode", label: "Importer Pincode" },
];
const SUPPLIER_KEYS = new Set(SUPPLIER_FIELDS.map((f) => f.key));
const TAX_KEYS = new Set(["hsn_code", "gst", "gst_rate"]);
const ALWAYS_VERIFY = /weight|hsn|gst|country_of_origin|mrp/;

const PACK_PATTERN = /\b(pack|set|combo) of \d+|\b\d+\s*(pcs|pieces|pc|units)\b/i;

function normaliseKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function fixField(field: ListingField): ListingField {
  const key = normaliseKey(field.key);
  const f: ListingField = { ...field, key, value: field.value.trim() };

  if (SUPPLIER_KEYS.has(key) && f.source !== "visible") {
    return { ...f, value: "", source: "unknown", verify: true, note: "Get this from your supplier or the product packaging." };
  }
  if (key === "country_of_origin" && f.source !== "visible") {
    return { ...f, value: "", source: "unknown", verify: true, note: "Country where it was made (check packaging), not where you sell from." };
  }
  if (TAX_KEYS.has(key)) {
    return { ...f, verify: true, note: f.note ?? "Verify with supplier/CA before submission." };
  }
  if (f.source !== "visible" || ALWAYS_VERIFY.test(key) || f.value === "") {
    return { ...f, verify: true };
  }
  return f;
}

export function ensureTitlePack(title: string, packQuantity: number): string {
  const t = title.trim();
  if (packQuantity <= 1 || PACK_PATTERN.test(t)) return t;
  return `${t} (Pack of ${packQuantity})`;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastBreak = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return (lastBreak > max * 0.6 ? cut.slice(0, lastBreak + 1) : cut).trim();
}

function defaultShot(slot: (typeof SLOTS)[number], d: ListingDetails): ShotPlanItem {
  const what = `${d.summary.color} ${d.summary.material} ${d.summary.product}`.replace(/\s+/g, " ").trim();
  const prompts = {
    primary: `Front hero shot of the ${what}, centred, filling about 85% of the frame.`,
    detail: `Three-quarter angle or close-up of the ${what} showing construction, texture and finish.`,
    size: `The ${what} shown once, side-on, with clean thin measurement lines for its main dimensions.`,
  } as const;
  return { slot, prompt: prompts[slot], callouts: [] };
}

/** Make AI output safe and consistent before we store or show it. */
export function postprocess(raw: ListingDetails): ListingDetails {
  const packQuantity = Math.max(1, Math.round(raw.summary.packQuantity || 1));

  const seen = new Set<string>();
  const fields: ListingField[] = [];
  for (const f of raw.fields) {
    const fixed = fixField(f);
    if (!fixed.key || seen.has(fixed.key)) continue;
    seen.add(fixed.key);
    fields.push(fixed);
  }
  for (const s of SUPPLIER_FIELDS) {
    if (!seen.has(s.key)) {
      fields.push({ ...s, value: "", note: "Get this from your supplier or the product packaging.", source: "unknown", verify: true });
    }
  }

  const netQty = fields.find((f) => f.key === "net_quantity");
  if (netQty && netQty.value !== String(packQuantity)) {
    netQty.value = String(packQuantity);
    netQty.note = netQty.note ?? "Pieces per customer order (per pack).";
  }

  const shotPlan = SLOTS.map(
    (slot) => raw.shotPlan.find((s) => s.slot === slot) ?? defaultShot(slot, raw),
  );

  return {
    ...raw,
    summary: { ...raw.summary, packQuantity },
    fields,
    title: ensureTitlePack(raw.title, packQuantity),
    altTitles: raw.altTitles.slice(0, 2).map((t) => ensureTitlePack(t, packQuantity)),
    description: truncate(raw.description.trim(), DESCRIPTION_MAX),
    keywords: Array.from(new Set(raw.keywords.map((k) => k.trim()).filter(Boolean))).slice(0, 10),
    shotPlan,
  };
}
