import { NextResponse } from "next/server";
import {
  isAiProviderId,
  listProviderStatuses,
  maskProviderKey,
  removeProviderCredential,
  storeProviderCredential,
  testProviderApiKey,
} from "@/lib/chat/providers";
import { isSuperAdminSession } from "@/lib/auth/staff";
import {
  checkRateLimit,
  isSameOrigin,
  rateLimitResponse,
  readJsonBody,
  RequestBodyError,
  sameOriginError,
} from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  if (!(await isSuperAdminSession())) {
    return NextResponse.json({ error: "super_admin_only" }, { status: 403 });
  }

  const providers = await listProviderStatuses();
  return NextResponse.json(
    {
      configured: providers.some((provider) => provider.configured),
      providers,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(
    request,
    "admin-settings",
    20,
    10 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  if (!(await isSuperAdminSession())) {
    return NextResponse.json({ error: "super_admin_only" }, { status: 403 });
  }

  let body: { provider?: unknown; apiKey?: unknown };
  try {
    body = await readJsonBody<typeof body>(request, 8_192);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    const code = error instanceof Error ? error.message : "invalid_request";
    return NextResponse.json({ error: code }, { status });
  }

  if (!isAiProviderId(body.provider)) {
    return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  }
  const key = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!key || key.length > 4096) {
    return NextResponse.json({ error: "invalid_provider_key" }, { status: 400 });
  }

  try {
    const model = await testProviderApiKey(body.provider, key);
    await storeProviderCredential(body.provider, key, model);
    return NextResponse.json({
      configured: true,
      provider: body.provider,
      hint: maskProviderKey(key),
      model,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "settings_update_failed";
    const status =
      code === "invalid_provider_key"
        ? 400
        : code === "provider_unavailable"
          ? 502
          : code === "invalid_origin"
            ? 403
            : 503;
    return NextResponse.json({ error: code }, { status });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return sameOriginError();
  const rateLimit = await checkRateLimit(
    request,
    "admin-settings",
    20,
    10 * 60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  if (!(await isSuperAdminSession())) {
    return NextResponse.json({ error: "super_admin_only" }, { status: 403 });
  }

  let provider: unknown = new URL(request.url).searchParams.get("provider");
  if (!isAiProviderId(provider)) {
    try {
      const body = await readJsonBody<{ provider?: unknown }>(request, 1_024);
      provider = body.provider;
    } catch (error) {
      const status = error instanceof RequestBodyError ? error.status : 400;
      return NextResponse.json({ error: "invalid_request" }, { status });
    }
  }
  if (!isAiProviderId(provider)) {
    return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  }

  try {
    await removeProviderCredential(provider);
    const status = (await listProviderStatuses()).find(
      (item) => item.id === provider,
    );
    return NextResponse.json({ provider: status });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "settings_update_failed";
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
