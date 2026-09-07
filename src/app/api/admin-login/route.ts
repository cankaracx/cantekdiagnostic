import { NextResponse } from "next/server";
import { isSuperAdminUsername } from "@/lib/auth/admin";
import { createServerSupabase, roleFromJwt } from "@/lib/supabase/server";
import {
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  sameOriginError,
} from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(
    request,
    "admin-login",
    8,
    15 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: { username?: string; password?: string };
  try {
    body = await readJsonBody<typeof body>(request, 2_048);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "invalid_request" }, { status });
  }

  const password = body.password ?? "";
  const email = process.env.SUPER_ADMIN_EMAIL;

  if (
    !isSuperAdminUsername(body.username) ||
    !password ||
    password.length > 256 ||
    !email
  ) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "authentication_unavailable" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  const role = roleFromJwt(data.user?.app_metadata);

  if (error || !data.user || role !== "super_admin") {
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
