"use client";

import type { SellerQuestions } from "@/lib/listing/schema";
import { Button, Icon, SectionHeading, inputClass } from "./ui";

export type QuestionsState = {
  answers: Record<string, string>;
  lifestyle: boolean;
  lifestyleScene: string;
  notes: string;
};

type Props = {
  questions: SellerQuestions;
  state: QuestionsState;
  onChange: (next: QuestionsState) => void;
  onBack: () => void;
  onSubmit: () => void;
  busy: boolean;
  busyText: string;
  count: number;
};

/** Step between upload and generation: the AI's questions, the in-use photo offer, and free notes. */
export function QuestionsPanel({ questions, state, onChange, onBack, onSubmit, busy, busyText, count }: Props) {
  const set = (patch: Partial<QuestionsState>) => onChange({ ...state, ...patch });
  const setAnswer = (id: string, value: string) => set({ answers: { ...state.answers, [id]: value } });

  return (
    <section className="max-w-[760px]">
      <SectionHeading num="✓" title="A few quick questions" />
      <p className="-mt-2 mb-6 text-[15px] text-muted">
        Looks like: <b className="text-ink">{questions.productGuess}</b>. Your answers make the listing more accurate — skip any you&apos;re not sure about.
      </p>

      <div className="flex flex-col gap-6">
        {questions.questions.map((q, i) => {
          const value = state.answers[q.id] ?? "";
          const isOption = q.options.includes(value);
          return (
            <fieldset key={q.id} className="m-0 border-0 p-0">
              <legend className="mb-2 text-[15px] font-extrabold">
                <span className="mr-2 text-[11px] font-semibold tracking-[0.1em] text-accent-strong">0{i + 1}</span>
                {q.question}
              </legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = value === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAnswer(q.id, on ? "" : o)}
                      className={`cursor-pointer border px-3 py-2 text-sm font-semibold ${on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:bg-field"}`}
                    >
                      {o}
                    </button>
                  );
                })}
                <input
                  aria-label={`Other answer: ${q.question}`}
                  value={isOption ? "" : value}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  maxLength={300}
                  placeholder="Other…"
                  className={`${inputClass} w-auto min-w-[180px] flex-1`}
                />
              </div>
            </fieldset>
          );
        })}

        <fieldset className="m-0 border-2 border-dashed border-line p-4">
          <legend className="px-1 text-[15px] font-extrabold">Want an in-use photo too?</legend>
          <p className="mb-3 mt-0 text-[13px] text-muted">Shows the product where it&apos;s used. Added as an extra image after the {count} you picked.</p>
          <div className="mb-3 flex gap-2">
            {[
              { v: true, l: "Yes, add it" },
              { v: false, l: "No thanks" },
            ].map(({ v, l }) => (
              <button
                key={l}
                type="button"
                aria-pressed={state.lifestyle === v}
                onClick={() => set({ lifestyle: v })}
                className={`cursor-pointer border px-3 py-2 text-sm font-semibold ${state.lifestyle === v ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:bg-field"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {state.lifestyle && (
            <>
              <label htmlFor="scene" className="mb-1 block text-xs text-ink-2">
                Scene (edit if you like)
              </label>
              <input id="scene" value={state.lifestyleScene} maxLength={300} onChange={(e) => set({ lifestyleScene: e.target.value })} className={inputClass} />
            </>
          )}
        </fieldset>

        <div>
          <label htmlFor="notes-q" className="mb-1 block text-[15px] font-extrabold">
            Anything else the AI should know?
          </label>
          <textarea
            id="notes-q"
            rows={3}
            maxLength={1000}
            value={state.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="e.g. rust-proof stainless steel, comes with screws, sold in rose gold and silver"
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={busy} className="flex-1 justify-between px-[18px] py-4 text-base">
          <span>{busy ? busyText : "Generate listing"}</span>
          <Icon name="arrow" size={20} />
        </Button>
      </div>
    </section>
  );
}
