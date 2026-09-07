import { NextResponse } from "next/server";
import { isStaffSession } from "@/lib/auth/staff";
import { answerQuestion } from "@/lib/chat/generate";
import { localeCookieName } from "@/i18n/routing";
import { cookies } from "next/headers";
import { isAppLocale } from "@/lib/geo/locales";
import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeChatMessages } from "@/lib/chat/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "content_type_must_be_json" },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    mode?: "public" | "technician";
    locale?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const messages = normalizeChatMessages(body.messages);
  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const jar = await cookies();
  const cookieLocale = jar.get(localeCookieName)?.value;
  const locale = isAppLocale(body.locale)
    ? body.locale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : "en";

  const staff = await isStaffSession();
  const staffMode = body.mode === "technician" && staff;
  const database = await createServerSupabase();

  try {
    const result = await answerQuestion({
      messages,
      locale,
      staffMode,
      database,
      signal: request.signal,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return NextResponse.json({ error: "request_cancelled" }, { status: 499 });
    }
    console.error("[chat] answer generation failed", error);
    return NextResponse.json(
      { error: "chat_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
