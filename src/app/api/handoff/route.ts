import { NextResponse } from "next/server";
import { getStaffAuth } from "@/lib/auth/staff";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  sameOriginError,
} from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(request, "handoff", 30, 60 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  const staff = await getStaffAuth();
  if (!staff) {
    return NextResponse.json({ error: "staff_only" }, { status: 403 });
  }

  let body: {
    modelSerial?: string;
    notes?: string;
    transcript?: { role: string; content: string }[];
    citedChunkIds?: string[];
  };
  try {
    body = await readJsonBody<typeof body>(request, 1_000_000);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "invalid_request" }, { status });
  }

  const transcript = Array.isArray(body.transcript)
    ? body.transcript.slice(0, 100).map((line) => ({
        role: String(line.role).slice(0, 20),
        content: String(line.content).slice(0, 8_000),
      }))
    : [];

  const packet = {
    created_by: staff.userId,
    technician_email: staff.email,
    model_serial: String(body.modelSerial ?? "").slice(0, 160),
    notes: String(body.notes ?? "").slice(0, 4_000),
    transcript,
    cited_chunk_ids: Array.isArray(body.citedChunkIds)
      ? body.citedChunkIds.slice(0, 100)
      : [],
    created_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("handoffs").insert(packet).select("id").single();
    if (error) return NextResponse.json({ error: "handoff_failed" }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  return NextResponse.json({ id: `local-${Date.now()}` });
}
