"use client";

import { forwardRef, useState } from "react";
import { useToast } from "./toast";

type ButtonVariant = "primary" | "outline" | "ghost";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-accent text-paper hover:bg-accent-hover active:bg-accent-strong border-0",
  outline: "bg-transparent text-ink border border-line hover:bg-ink/[0.07]",
  ghost: "bg-transparent text-accent-strong border-0 hover:bg-accent/10",
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function Button({ variant = "outline", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex cursor-pointer items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON[variant]} ${className}`}
        {...props}
      />
    );
  },
);

export function SectionHeading({ num, title, right, className = "" }: { num?: string; title: string; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex items-baseline gap-2.5 border-b-2 border-line pb-2 ${className}`}>
      {num && <span className="text-[11px] font-semibold tracking-[0.1em] text-accent-strong">{num}</span>}
      <h2 className="m-0 mr-auto text-xl font-extrabold">{title}</h2>
      {right}
    </div>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-[11px] ${tone === "accent" ? "bg-accent-soft text-accent-ink" : "bg-chip text-ink-2"}`}>
      {children}
    </span>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-px border border-line bg-line" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer border-0 px-3 py-2.5 text-left text-sm font-semibold ${on ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-field"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const inputClass =
  "w-full min-h-10 rounded-none border border-line bg-field px-2.5 py-2 text-sm text-ink focus:border-accent";

export function Icon({ name, size = 15 }: { name: "upload" | "download" | "arrow" | "refresh" | "check" | "copy" | "close" | "plus" | "trash"; size?: number }) {
  const paths: Record<typeof name, React.ReactNode> = {
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    plus: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="square" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}`}
      title={label}
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast("Couldn't copy — select the text and copy it manually.");
        }
      }}
      className="inline-flex size-8 flex-none cursor-pointer items-center justify-center border border-line bg-transparent text-ink hover:bg-ink/[0.07] disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
    </button>
  );
}

export function StepsBar({ active }: { active: 0 | 1 | 2 }) {
  const steps = ["Upload", "Generate", "Review & export"];
  return (
    <div className="grid grid-cols-3 gap-0.5 border-b-2 border-line bg-line">
      {steps.map((label, i) => {
        const state = i < active ? "done" : i === active ? "active" : "todo";
        return (
          <div
            key={label}
            className="flex min-w-0 items-baseline gap-2.5 bg-paper px-6 py-3"
            style={{ boxShadow: `inset 0 4px 0 ${state === "active" ? "#ec3013" : state === "done" ? "#201e1d" : "transparent"}` }}
          >
            <span className={`text-[11px] font-semibold tracking-[0.1em] ${state === "todo" ? "text-faint" : "text-accent-strong"}`}>0{i + 1}</span>
            <span className={`truncate text-sm font-extrabold ${state === "todo" ? "text-faint" : "text-ink"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
