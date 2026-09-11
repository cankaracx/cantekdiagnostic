import { NextResponse } from "next/server";
import { isStaffSession } from "@/lib/auth/staff";
import { answerQuestion } from "@/lib/chat/generate";
import { localeCookieName } from "@/i18n/routing";
import { cookies } from "next/headers";
import { isAppLocale } from "@/lib/geo/locales";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  acquireConcurrencyLease,
  checkGlobalRateLimit,
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  readJsonBody,
  releaseConcurrencyLease,
  RequestBodyError,
  sameOriginError,
} from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 60;

function boundedEnvironmentNumber(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(request, "public-chat", 24, 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    mode?: "public" | "technician";
    locale?: string;
    serial?: string;
  };
  try {
    body = await readJsonBody<typeof body>(request, 100_000);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    const code = error instanceof Error ? error.message : "invalid_request";
    return NextResponse.json({ error: code }, { status });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages
        .slice(-12)
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
  const serial =
    typeof body.serial === "string" ? body.serial.trim().slice(0, 80) : "";

  if (!staffMode) {
    const dailyLimit = await checkGlobalRateLimit(
      "public-chat-daily",
      boundedEnvironmentNumber("PUBLIC_CHAT_DAILY_LIMIT", 1_000, 50, 100_000),
      24 * 60 * 60_000,
    );
    if (!dailyLimit.allowed) return rateLimitResponse(dailyLimit.retryAfter);
  }

  const lease = await acquireConcurrencyLease(
    "chat",
    boundedEnvironmentNumber("CHAT_MAX_CONCURRENCY", 20, 1, 200),
    75,
  );
  if (!lease) return rateLimitResponse(10);

  try {
    const result = await answerQuestion({
      messages,
      locale,
      staffMode,
      database,
      serial: serial || undefined,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "chat_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await releaseConcurrencyLease(lease);
  }
}
