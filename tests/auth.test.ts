import { describe, expect, it } from "vitest";
import {
  SUPER_ADMIN_USERNAME,
  isSuperAdminUsername,
} from "@/lib/auth/admin";
import {
  isVerifiedEmailUser,
  shouldShowFirstVisitGate,
} from "@/lib/auth/user";
import { roleFromJwt } from "@/lib/supabase/server";

describe("customer access choice", () => {
  it("prompts a new guest and remembers an explicit guest bypass", () => {
    expect(shouldShowFirstVisitGate(false, null)).toBe(true);
    expect(shouldShowFirstVisitGate(false, "guest")).toBe(false);
  });

  it("prompts again when an account session expires", () => {
    expect(shouldShowFirstVisitGate(false, "account")).toBe(true);
    expect(shouldShowFirstVisitGate(true, "account")).toBe(false);
  });

  it("requires confirmed email metadata", () => {
    expect(isVerifiedEmailUser({ email_confirmed_at: null })).toBe(false);
    expect(
      isVerifiedEmailUser({ email_confirmed_at: "2026-09-06T19:00:00Z" }),
    ).toBe(true);
  });
});

describe("administrator identity and authorization", () => {
  it("maps only the configured public username", () => {
    expect(SUPER_ADMIN_USERNAME).toBe("admin");
    expect(isSuperAdminUsername(" ADMIN ")).toBe(true);
    expect(isSuperAdminUsername("administrator")).toBe(false);
    expect(isSuperAdminUsername(undefined)).toBe(false);
  });

  it("recognizes server-controlled super-admin role metadata", () => {
    expect(roleFromJwt({ role: "super_admin" })).toBe("super_admin");
    expect(roleFromJwt({ role: "admin" })).toBe("admin");
    expect(roleFromJwt({ role: "ordinary_user" })).toBeNull();
    expect(roleFromJwt(null)).toBeNull();
  });
});
