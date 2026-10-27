import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthorized, safeNextPath } from "@/lib/auth";

/**
 * Password gate for the whole site. Everything except the login page, the health check and
 * Next's static assets needs the auth cookie set by the login form: pages are sent to /login,
 * API routes get a 401.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authed = await isAuthorized(req.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/login") {
    // Already signed in → skip the form. (POST is the login action itself; let it run.)
    if (authed && req.method === "GET") {
      return NextResponse.redirect(new URL(safeNextPath(req.nextUrl.searchParams.get("next")), req.nextUrl));
    }
    return NextResponse.next();
  }
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Password required. Open the site in your browser and sign in." }, { status: 401 });
  }
  const login = new URL("/login", req.nextUrl);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's static assets, the favicon and the public health check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
