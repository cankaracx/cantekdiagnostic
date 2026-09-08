import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const localConcurrency = new Map<string, number>();
const MAX_BUCKETS = 5_000;

export class RequestBodyError extends Error {
  constructor(
    message: "invalid_request" | "request_too_large",
    public readonly status: 400 | 413,
  ) {
    super(message);
  }
}

function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    "unknown"
  ).slice(0, 128);
}

function localRateLimit(
  identifier: string,
  scope: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const key = `${scope}:${identifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      while (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (typeof oldestKey !== "string") break;
        buckets.delete(oldestKey);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
      if (buckets.size <= MAX_BUCKETS) break;
    }
  }

  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

async function checkIdentifierRateLimit(
  identifier: string,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const service =
    process.env.NODE_ENV === "test" ? null : createServiceSupabase();
  if (service) {
    const secret =
      process.env.RATE_LIMIT_SALT ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      "cantek-local-rate-limit";
    const keyHash = createHmac("sha256", secret)
      .update(identifier)
      .digest("hex");
    const { data, error } = await service.rpc("consume_rate_limit", {
      rate_scope: scope.slice(0, 80),
      rate_key_hash: keyHash,
      rate_limit: limit,
      rate_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (
      !error &&
      result &&
      typeof result.allowed === "boolean" &&
      Number.isFinite(Number(result.retry_after))
    ) {
      return {
        allowed: result.allowed,
        retryAfter: Number(result.retry_after),
      };
    }
  }

  return localRateLimit(identifier, scope, limit, windowMs);
}

export function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  return checkIdentifierRateLimit(
    clientAddress(request),
    scope,
    limit,
    windowMs,
  );
}

export function checkGlobalRateLimit(
  scope: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  return checkIdentifierRateLimit("global", scope, limit, windowMs);
}

export type ConcurrencyLease = {
  id: string;
  scope: string;
  distributed: boolean;
};

export async function acquireConcurrencyLease(
  scope: string,
  limit: number,
  leaseSeconds: number,
): Promise<ConcurrencyLease | null> {
  const id = randomUUID();
  const service =
    process.env.NODE_ENV === "test" ? null : createServiceSupabase();
  if (service) {
    const { data, error } = await service.rpc("acquire_concurrency_lease", {
      lease_scope: scope.slice(0, 80),
      requested_lease_id: id,
      max_concurrency: limit,
      lease_seconds: leaseSeconds,
    });
    if (!error && typeof data === "boolean") {
      return data ? { id, scope, distributed: true } : null;
    }
  }

  const active = localConcurrency.get(scope) ?? 0;
  if (active >= limit) return null;
  localConcurrency.set(scope, active + 1);
  return { id, scope, distributed: false };
}

export async function releaseConcurrencyLease(
  lease: ConcurrencyLease,
): Promise<void> {
  if (lease.distributed) {
    const service = createServiceSupabase();
    if (service) {
      await service.rpc("release_concurrency_lease", {
        lease_scope: lease.scope,
        requested_lease_id: lease.id,
      });
      return;
    }
  }

  const active = localConcurrency.get(lease.scope) ?? 0;
  if (active <= 1) localConcurrency.delete(lease.scope);
  else localConcurrency.set(lease.scope, active - 1);
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

function originHost(value: string): { hostname: string; port: string } | null {
  try {
    const parsed = new URL(value);
    return { hostname: parsed.hostname, port: parsed.port };
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowed = new Set<string>([new URL(request.url).origin]);
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      return false;
    }
  }
  if (allowed.has(origin)) return true;

  const requestHost = originHost(request.url);
  const originParts = originHost(origin);
  return Boolean(
    requestHost &&
      originParts &&
      isLoopbackHost(requestHost.hostname) &&
      isLoopbackHost(originParts.hostname) &&
      requestHost.port === originParts.port,
  );
}

export function sameOriginError(): NextResponse {
  return NextResponse.json(
    { error: "invalid_origin" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError("request_too_large", 413);
  }

  if (!request.body) throw new RequestBodyError("invalid_request", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("request_too_large", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError("invalid_request", 400);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestBodyError("invalid_request", 400);
  }
}
