import { NextResponse } from "next/server";
import {
  maskAnthropicKey,
  readAnthropicApiKey,
  storeAnthropicApiKey,
  testAnthropicApiKey,
} from "@/lib/chat/anthropic";
import { isSuperAdminSession } from "@/lib/auth/staff";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  if (!(await isSuperAdminSession())) {
    return NextResponse.json({ error: "super_admin_only" }, { status: 403 });
  }

  const key = await readAnthropicApiKey();
  return NextResponse.json({
    configured: Boolean(key),
    hint: key ? maskAnthropicKey(key) : null,
  });
}

export async function POST(request: Request) {
  if (!(await isSuperAdminSession())) {
    return NextResponse.json({ error: "super_admin_only" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let body: { anthropicApiKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const key =
    typeof body.anthropicApiKey === "string"
      ? body.anthropicApiKey.trim()
      : "";
  if (!key || key.length > 4096) {
    return NextResponse.json({ error: "invalid_anthropic_key" }, { status: 400 });
  }

  try {
    await testAnthropicApiKey(key);
    await storeAnthropicApiKey(key);
    return NextResponse.json({
      configured: true,
      hint: maskAnthropicKey(key),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "settings_update_failed";
    const status =
      code === "invalid_anthropic_key"
        ? 400
        : code === "anthropic_unavailable"
          ? 502
          : 503;
    return NextResponse.json({ error: code }, { status });
  }
}
