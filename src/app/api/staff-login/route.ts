import { NextResponse } from "next/server";
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
    "staff-login",
    10,
    15 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: { email?: string; password?: string };
  try {
    body = await readJsonBody<typeof body>(request, 4_096);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "invalid_request" }, { status });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || email.length > 254 || !password || password.length > 256) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "authentication_unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const role = roleFromJwt(data.user?.app_metadata);
  if (error || !data.user || !role) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, role });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
