"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "New product", match: (p: string) => p === "/" || p.startsWith("/listing") },
  { href: "/library", label: "Library", match: (p: string) => p.startsWith("/library") },
  { href: "/analytics", label: "Analytics", soon: true, match: (p: string) => p.startsWith("/analytics") },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-line px-6 py-3.5">
      <Link href="/" className="mr-auto flex items-center gap-2.5 text-ink no-underline hover:text-ink">
        <span className="size-[18px] bg-accent" aria-hidden />
        <span className="text-lg font-extrabold tracking-[-0.015em]">Listora</span>
      </Link>
      <nav className="flex flex-wrap items-center gap-1">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-sm font-semibold no-underline hover:text-accent ${
                active ? "border-accent text-ink" : "border-transparent text-muted"
              }`}
            >
              {n.label}
              {n.soon && (
                <span className="bg-accent-soft px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-accent-ink">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
