"use client";

import { useState } from "react";
import { DESCRIPTION_MAX } from "@/lib/listing/postprocess";
import type { ListingDetails, ListingField, ListingPatch } from "@/lib/listing/schema";
import { CopyButton, SectionHeading, Tag, inputClass } from "../ui";

type Props = { details: ListingDetails; onSave: (patch: ListingPatch) => void };

/** Text input that saves on blur, and resyncs if the server value changes. */
function EditableText({
  value,
  onCommit,
  multiline,
  label,
  rows = 3,
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  label: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const commit = () => draft !== value && onCommit(draft);
  return multiline ? (
    <textarea aria-label={label} rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className={`${inputClass} resize-y leading-relaxed`} />
  ) : (
    <input aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className={inputClass} />
  );
}

function SourceBadge({ field }: { field: ListingField }) {
  if (field.source === "unknown" || !field.value) return <Tag tone="accent">Fill in</Tag>;
  if (field.verify) return <Tag tone="accent">Verify</Tag>;
  if (field.source === "estimated") return <Tag>Estimated</Tag>;
  return null;
}

export function ListingDetailsPanel({ details, onSave }: Props) {
  const [description, setDescription] = useState(details.description);
  const [syncedDescription, setSyncedDescription] = useState(details.description);
  if (syncedDescription !== details.description) {
    setSyncedDescription(details.description);
    setDescription(details.description);
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <SectionHeading num="A" title="Meesho fields — copy & paste" />
        <p className="-mt-2 mb-3 text-[13px] text-muted">
          Edit any value; changes save automatically. <b className="text-accent-ink">Verify</b> means the AI estimated it — check before publishing.
        </p>
        <div className="border-t border-line">
          {details.fields.map((f) => (
            <div key={f.key} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto] items-start gap-3 border-b border-line py-2.5">
              <div className="pt-2 text-[13px] text-ink-2">
                {f.label}
                <div className="mt-1">
                  <SourceBadge field={f} />
                </div>
              </div>
              <div className="min-w-0">
                <EditableText label={f.label} value={f.value} onCommit={(value) => onSave({ fields: [{ key: f.key, value }] })} />
                {f.note && <div className="mt-1 text-xs text-muted">{f.note}</div>}
              </div>
              <div className="pt-1">
                <CopyButton text={f.value} label={`Copy ${f.label}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-8">
        <div>
          <SectionHeading num="B" title="Title" right={<CopyButton text={details.title} label="Copy title" />} />
          <EditableText label="Title" multiline rows={2} value={details.title} onCommit={(title) => onSave({ title })} />
          {details.altTitles.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-ink-2">Alternatives</div>
              {details.altTitles.map((t) => (
                <div key={t} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm">
                  <span>{t}</span>
                  <CopyButton text={t} label="Copy alternative title" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeading
            num="C"
            title="Description"
            right={
              <span className="flex items-center gap-2">
                <span className={`text-xs ${description.length > DESCRIPTION_MAX ? "font-bold text-accent-strong" : "text-muted"}`}>
                  {description.length}/{DESCRIPTION_MAX}
                </span>
                <CopyButton text={description} label="Copy description" />
              </span>
            }
          />
          <textarea
            aria-label="Description"
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== details.description && onSave({ description })}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>

        <div>
          <SectionHeading num="D" title="Search keywords" right={<CopyButton text={details.keywords.join(", ")} label="Copy keywords" />} />
          <div className="flex flex-wrap gap-1.5">
            {details.keywords.map((k) => (
              <span key={k} className="bg-chip px-2.5 py-1 text-[13px] text-ink-2">
                {k}
              </span>
            ))}
          </div>
        </div>

        {details.measurements.length > 0 && (
          <div>
            <SectionHeading num="E" title="Measurements" />
            {details.measurements.map((m) => (
              <div key={m.name} className="flex justify-between gap-3 border-b border-line py-2 text-[13px]">
                <span className="text-muted">{m.name}</span>
                <span className="text-right font-semibold">
                  {m.value === null ? "—" : `${m.approximate ? "~" : ""}${m.value} ${m.unit}`}
                  {m.approximate && <span className="ml-2 font-normal text-muted">approx.</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {details.verifyBeforePublishing.length > 0 && (
          <div className="border-t-4 border-accent bg-accent-soft p-4">
            <div className="mb-2 text-sm font-extrabold text-accent-ink">Check before publishing</div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-accent-ink">
              {details.verifyBeforePublishing.map((v) => (
                <li key={v}>— {v}</li>
              ))}
            </ul>
          </div>
        )}

        {details.assumptions.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">What the AI assumed</div>
            <ul className="m-0 list-none p-0 text-[13px] text-ink-2">
              {details.assumptions.map((a) => (
                <li key={a} className="border-b border-line py-1.5">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
