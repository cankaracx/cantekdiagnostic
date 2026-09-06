import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/en";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const destination = new URL(next, url.origin);
  const supabase = await createServerSupabase();

  if (!supabase) {
    destination.searchParams.set("auth", "unavailable");
    return NextResponse.redirect(destination);
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation token") };

  destination.searchParams.set("auth", result.error ? "error" : "verified");
  return NextResponse.redirect(destination);
}
