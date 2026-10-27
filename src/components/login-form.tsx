"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";
import { Button, inputClass } from "@/components/ui";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-strong">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "password-error" : undefined}
        className={inputClass}
      />
      {state.error && (
        <p id="password-error" role="alert" className="m-0 text-sm font-semibold text-accent-strong">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending} className="justify-center">
        {pending ? "Checking…" : "Open Listora"}
      </Button>
    </form>
  );
}
