import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth/staff";
import { ingestFile } from "@/lib/rag/ingest";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Visibility } from "@/lib/rag/types";
import { isAppLocale } from "@/lib/geo/locales";
import {
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  sameOriginError,
} from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(
    request,
    "document-ingest",
    5,
    60 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 21 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size === 0 || file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!extension || ![".pdf", ".docx", ".md", ".txt"].includes(extension)) {
    return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
  }

  const visibility = form.get("visibility") === "internal" ? "internal" : "repair";
  const field = (name: string, max: number) => String(form.get(name) || "").trim().slice(0, max);
  const title = field("title", 180) || file.name.replace(/\.[^.]+$/, "").slice(0, 180);
  const requestedLanguage = field("language", 16);
  const language = isAppLocale(requestedLanguage) ? requestedLanguage : "en";
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = await createServerSupabase();

  try {
    const doc = await ingestFile(file.name, buffer, {
      title,
      language,
      equipment: field("equipment", 120) || undefined,
      refrigerant: field("refrigerant", 80) || undefined,
      visibility: visibility as Visibility,
      version: field("version", 80) || undefined,
      filePath: file.name.slice(0, 255),
    }, supabase);

    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof Error && error.message === "no_extractable_text") {
      return NextResponse.json({ error: "no_extractable_text" }, { status: 422 });
    }
    if (error instanceof Error && error.message === "unsupported_file_type") {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
    }
    if (error instanceof Error && error.message === "document_too_large") {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
}
