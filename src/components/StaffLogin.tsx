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
    <form onSubmit={onSubmit} className="cantek-form mx-auto max-w-md space-y-4">
      <div className="border-s-4 border-cantek-cyan ps-4">
        <p className="cantek-kicker text-cantek-cyan">{t("title")}</p>
        <h2 className="mt-1 text-2xl font-bold text-cantek-text">{t("signIn")}</h2>
      </div>
      <p className="text-sm text-cantek-muted">{t("authorizedOnly")}</p>
      <label className="grid gap-2 text-sm font-semibold text-cantek-text">
        {t("email")}
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-cantek-text">
        {t("password")}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="border-s-4 border-danger bg-red-50 px-3 py-2 text-sm text-red-800">{t("invalidCredentials")}</p>}
      <button
        disabled={busy}
        className="cantek-button w-full"
      >
        {t("signIn")}
      </button>
    </form>
  );
}
