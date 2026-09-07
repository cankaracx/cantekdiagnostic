import { NextResponse } from "next/server";
import { isVerifiedEmailUser } from "@/lib/auth/user";
import { isAppLocale } from "@/lib/geo/locales";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  sameOriginError,
} from "@/lib/security/request";

type AuthRequest = {
  action?: "sign-in" | "sign-up";
  email?: string;
  password?: string;
  locale?: string;
};

export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: data.user.email ?? null,
      verified: isVerifiedEmailUser(data.user),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(
    request,
    "user-auth",
    12,
    15 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: AuthRequest;
  try {
    body = await readJsonBody<AuthRequest>(request, 4_096);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "invalid_request" }, { status });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 256
  ) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "authentication_unavailable" },
      { status: 503 },
    );
  }

  if (body.action === "sign-up") {
    const locale = isAppLocale(body.locale) ? body.locale : "en";
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.NODE_ENV === "production" && !configuredSiteUrl) {
      return NextResponse.json(
        { error: "authentication_unavailable" },
        { status: 503 },
      );
    }
    const siteUrl = configuredSiteUrl
      ? new URL(configuredSiteUrl).origin
      : new URL(request.url).origin;
    const emailRedirectTo = new URL(
      `/auth/confirm?next=/${locale}`,
      siteUrl,
    ).toString();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) {
      return NextResponse.json({ error: "sign_up_failed" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verificationRequired: !data.session,
    });
  }

  if (body.action !== "sign-in") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user || !isVerifiedEmailUser(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
