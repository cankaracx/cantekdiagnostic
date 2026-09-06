"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export type UserAuthCardProps = {
  allowGuest?: boolean;
  onAuthenticated?: () => void;
  onGuest?: () => void;
};

export function UserAuthCard({
  allowGuest = false,
  onAuthenticated,
  onGuest,
}: UserAuthCardProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "check-email" | "error">(
    "idle",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("busy");

    try {
      const response = await fetch("/api/user-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password, locale }),
      });
      const result = (await response.json()) as {
        verificationRequired?: boolean;
      };

      if (!response.ok) {
        setStatus("error");
        return;
      }

      if (result.verificationRequired) {
        setStatus("check-email");
        return;
      }

      window.localStorage.setItem("cantek-access-choice", "account");
      setStatus("idle");
      onAuthenticated?.();
      window.location.reload();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="cantek-form w-full max-w-md">
      <div className="border-s-4 border-cantek-cyan ps-4">
        <p className="cantek-kicker">{t("kicker")}</p>
        <h2 className="mt-1 text-2xl font-bold text-cantek-text">
          {t(mode === "sign-in" ? "signInTitle" : "signUpTitle")}
        </h2>
      </div>

      <div className="mt-6 grid grid-cols-2 border border-cantek-border">
        <button
          type="button"
          onClick={() => {
            setMode("sign-in");
            setStatus("idle");
          }}
          className={mode === "sign-in" ? "auth-tab-active" : "auth-tab"}
        >
          {t("signIn")}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign-up");
            setStatus("idle");
          }}
          className={mode === "sign-up" ? "auth-tab-active" : "auth-tab"}
        >
          {t("createAccount")}
        </button>
      </div>

      <form onSubmit={submit}>
        <label className="mt-5 grid gap-2 text-sm font-semibold text-cantek-text">
          {t("email")}
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-semibold text-cantek-text">
          {t("password")}
          <input
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {mode === "sign-up" && (
          <p className="mt-2 text-xs leading-5 text-cantek-muted">
            {t("verificationNote")}
          </p>
        )}
        {status === "check-email" && (
          <p className="mt-4 border-s-4 border-cantek-cyan bg-sky-50 px-3 py-2 text-sm text-sky-900">
            {t("checkEmail")}
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 border-s-4 border-cantek-red bg-red-50 px-3 py-2 text-sm text-red-800">
            {t("error")}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "busy"}
          className="cantek-button mt-6 w-full"
        >
          {status === "busy"
            ? t("working")
            : t(mode === "sign-in" ? "signIn" : "createAccount")}
        </button>
      </form>

      {allowGuest && (
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("cantek-access-choice", "guest");
            onGuest?.();
          }}
          className="mt-4 w-full border border-cantek-dark px-4 py-2.5 text-sm font-semibold text-cantek-dark transition hover:bg-cantek-dark hover:text-white"
        >
          {t("continueGuest")}
        </button>
      )}
    </div>
  );
}
