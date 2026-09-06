import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { localeCookieName, routing } from "@/i18n/routing";
import { detectLocale } from "@/lib/geo/locales";

const intlMiddleware = createMiddleware(routing);

function withLocaleCookie(request: NextRequest, locale: string): NextRequest {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const parts = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith(`${localeCookieName}=`));
  parts.push(`${localeCookieName}=${locale}`);
  const headers = new Headers(request.headers);
  headers.set("cookie", parts.join("; "));
  return new NextRequest(request.url, { headers });
}

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const isRootAdmin = request.nextUrl.pathname === "/admin";
  let response: NextResponse;

  if (isApi) {
    response = NextResponse.next();
  } else if (isRootAdmin) {
    const existing = request.cookies.get(localeCookieName)?.value;
    const detected = detectLocale(request.headers, existing);
    const destination = request.nextUrl.clone();
    destination.pathname = `/${detected}/admin`;
    response = NextResponse.rewrite(destination);

    if (!existing) {
      response.cookies.set(localeCookieName, detected, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  } else {
    const existing = request.cookies.get(localeCookieName)?.value;
    const detected = detectLocale(request.headers, existing);
    const localizedRequest = existing
      ? request
      : withLocaleCookie(request, detected);
    response = intlMiddleware(localizedRequest) ?? NextResponse.next();

    if (!existing) {
      response.cookies.set(localeCookieName, detected, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
