"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function AdminLogin() {
  const t = useTranslations("adminAuth");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setBusy(true);

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError(true);
        return;
      }

      window.location.reload();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cantek-form mx-auto max-w-md">
      <div className="border-s-4 border-cantek-cyan ps-4">
        <p className="cantek-kicker">{t("kicker")}</p>
        <h2 className="mt-1 text-2xl font-bold text-cantek-text">
          {t("title")}
        </h2>
      </div>
      <p className="mt-5 text-sm leading-6 text-cantek-muted">{t("intro")}</p>

      <label className="mt-6 grid gap-2 text-sm font-semibold text-cantek-text">
        {t("username")}
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-cantek-text">
        {t("password")}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error && (
        <p className="mt-4 border-s-4 border-cantek-red bg-red-50 px-3 py-2 text-sm text-red-800">
          {t("invalid")}
        </p>
      )}

      <button type="submit" disabled={busy} className="cantek-button mt-6 w-full">
        {busy ? t("working") : t("signIn")}
      </button>
    </form>
  );
}
