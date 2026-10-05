"use client";

import { formatUsd } from "@/lib/ai/pricing";
import type { ProviderName } from "@/lib/listing/schema";
import type { ModelOptionDTO } from "@/lib/listing/types";
import { inputClass } from "./ui";

const GROUPS: Array<{ provider: ProviderName; title: string }> = [
  { provider: "gemini", title: "Gemini" },
  { provider: "openai", title: "OpenAI" },
];

function estimate(m: ModelOptionDTO, usdToInr?: number | null) {
  if (m.estimateUsd === null) return "Price shows after your first image";
  const where = m.estimateSource === "official" ? "per image" : "per image (your average)";
  return `≈ ${formatUsd(m.estimateUsd, usdToInr)} ${where}${m.avgSeconds ? ` · ~${m.avgSeconds}s` : ""}`;
}

/** Full picker for the upload screen: models grouped by provider, with blurb and price. */
export function ModelPicker({
  models,
  value,
  onChange,
  usdToInr,
}: {
  models: ModelOptionDTO[];
  value: string;
  onChange: (id: string) => void;
  usdToInr?: number | null;
}) {
  return (
    <div role="radiogroup" aria-label="Image model" className="flex flex-col gap-4">
      {GROUPS.map((g) => {
        const list = models.filter((m) => m.provider === g.provider);
        if (!list.length) return null;
        return (
          <div key={g.provider}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{g.title}</div>
            <div className="flex flex-col gap-px border border-line bg-line">
              {list.map((m) => {
                const on = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange(m.id)}
                    className={`grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-start gap-3 border-0 px-3 py-2.5 text-left ${on ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-field"}`}
                  >
                    <span className={`mt-1 size-3.5 rounded-full border-2 ${on ? "border-paper bg-accent" : "border-line"}`} aria-hidden />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-extrabold">{m.label}</span>
                      <span className={`text-xs ${on ? "text-paper/80" : "text-muted"}`}>{m.blurb}</span>
                      <span className={`mt-0.5 text-xs font-semibold ${on ? "text-paper" : "text-ink-2"}`}>{estimate(m, usdToInr)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact dropdown for picking a model for one new image version. */
export function ModelSelect({
  models,
  value,
  onChange,
  id,
}: {
  models: ModelOptionDTO[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-auto min-w-[220px]`}>
      {GROUPS.map((g) => (
        <optgroup key={g.provider} label={g.title}>
          {models
            .filter((m) => m.provider === g.provider)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.estimateUsd !== null ? ` — ≈ ${formatUsd(m.estimateUsd)}` : ""}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
