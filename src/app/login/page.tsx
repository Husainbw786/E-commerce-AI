import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in — Listora" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-6 py-14">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="size-[18px] bg-accent" aria-hidden />
        <span className="text-lg font-extrabold tracking-[-0.015em]">Listora</span>
      </div>
      <h1 className="m-0 mb-1.5 text-[clamp(28px,4.5vw,36px)] font-extrabold leading-[1.08] tracking-[-0.02em]">Enter the password</h1>
      <p className="m-0 mb-6 text-[15px] text-muted">This site is private. You only need to do this once per browser.</p>
      <LoginForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} />
    </main>
  );
}
