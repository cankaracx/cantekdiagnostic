import { NextResponse } from "next/server";
import { isSuperAdminUsername } from "@/lib/auth/admin";
import { createServerSupabase, roleFromJwt } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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

export async function DELETE() {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
