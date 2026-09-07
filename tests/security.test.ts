import { describe, expect, it } from "vitest";
import {
  acquireConcurrencyLease,
  checkRateLimit,
  isSameOrigin,
  readJsonBody,
  releaseConcurrencyLease,
  RequestBodyError,
} from "@/lib/security/request";
import { safeNext } from "@/app/auth/confirm/route";

describe("request hardening", () => {
  it("rejects cross-site state-changing requests", () => {
    const request = new Request("https://diagnostics.example/api/chat", {
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(isSameOrigin(request)).toBe(false);
  });

  it("accepts same-origin requests", () => {
    const request = new Request("https://diagnostics.example/api/chat", {
      headers: { origin: "https://diagnostics.example" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("enforces JSON body limits even before parsing", async () => {
    const request = new Request("https://diagnostics.example/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "too large" }),
      headers: { "content-length": "1000" },
    });
    await expect(readJsonBody(request, 32)).rejects.toMatchObject({
      message: "request_too_large",
      status: 413,
    } satisfies Partial<RequestBodyError>);
  });

  it("limits repeated requests within the same window", async () => {
    const request = new Request("https://diagnostics.example/api/chat", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const scope = `test-${Date.now()}-${Math.random()}`;
    expect((await checkRateLimit(request, scope, 1, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit(request, scope, 1, 60_000)).allowed).toBe(false);
  });

  it("rejects backslash and cross-origin confirmation redirects", () => {
    const origin = "https://diagnostics.example";
    expect(safeNext("/tr", origin)).toBe("/tr");
    expect(safeNext("/tr?auth=verified", origin)).toBe("/tr?auth=verified");
    expect(safeNext("/\\evil.example", origin)).toBe("/en");
    expect(safeNext("//evil.example", origin)).toBe("/en");
    expect(safeNext("https://evil.example", origin)).toBe("/en");
  });

  it("caps and releases concurrent chat work", async () => {
    const scope = `test-concurrency-${Date.now()}`;
    const first = await acquireConcurrencyLease(scope, 1, 30);
    expect(first).not.toBeNull();
    expect(await acquireConcurrencyLease(scope, 1, 30)).toBeNull();

    await releaseConcurrencyLease(first!);
    const replacement = await acquireConcurrencyLease(scope, 1, 30);
    expect(replacement).not.toBeNull();
    await releaseConcurrencyLease(replacement!);
  });
});
