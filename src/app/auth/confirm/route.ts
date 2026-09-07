import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export function safeNext(value: string | null, origin: string): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/en";
  }

  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return "/en";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/en";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), url.origin);
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
