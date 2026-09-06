import { NextResponse } from "next/server";
import { createServerSupabase, roleFromJwt } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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

export async function DELETE() {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
