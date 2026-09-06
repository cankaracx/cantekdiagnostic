"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function StaffLogin() {
  const t = useTranslations("tech");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("invalid");
        return;
      }
      window.location.reload();
    } catch {
      setError("invalid");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4 rounded-md border border-navy/10 bg-white p-6">
      <h2 className="text-lg font-semibold text-navy">{t("signIn")}</h2>
      <p className="text-sm text-navy/60">{t("authorizedOnly")}</p>
      <label className="grid gap-1 text-sm">
        {t("email")}
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-sm border border-navy/15 px-3 py-2"
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t("password")}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-sm border border-navy/15 px-3 py-2"
          required
        />
      </label>
      {error && <p className="text-sm text-danger">{t("invalidCredentials")}</p>}
      <button
        disabled={busy}
        className="rounded-sm bg-navy px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {t("signIn")}
      </button>
    </form>
  );
}
