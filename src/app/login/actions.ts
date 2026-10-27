"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieOptions, authToken, passwordMatches, safeNextPath } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    // A short, shared password: slow guessing down a little.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: "That's not it. Try again." };
  }
  (await cookies()).set(AUTH_COOKIE, await authToken(), authCookieOptions());
  redirect(safeNextPath(formData.get("next")));
}
