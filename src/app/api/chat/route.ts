import { NextResponse } from "next/server";
import { isStaffSession } from "@/lib/auth/staff";
import { answerQuestion } from "@/lib/chat/generate";
import { localeCookieName } from "@/i18n/routing";
import { cookies } from "next/headers";
import { isAppLocale } from "@/lib/geo/locales";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
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

  const messages = Array.isArray(body.messages)
    ? body.messages
        .slice(-20)
        .filter(
          (message) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string",
        )
        .map((message) => ({
          role: message.role,
          content: message.content.trim().slice(0, 4_000),
        }))
        .filter((message) => message.content.length > 0)
    : [];
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

  const result = await answerQuestion({
    messages,
    locale,
    staffMode,
    database,
  });

  return NextResponse.json(result);
}
