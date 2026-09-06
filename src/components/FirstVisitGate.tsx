"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { UserAuthCard } from "@/components/UserAuthCard";
import { shouldShowFirstVisitGate, type AccessChoice } from "@/lib/auth/user";

export function FirstVisitGate() {
  const t = useTranslations("account");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const response = await fetch("/api/user-auth", { cache: "no-store" });
        const result = (await response.json()) as { authenticated?: boolean };
        if (!active) return;

        if (result.authenticated) {
          window.localStorage.setItem("cantek-access-choice", "account");
          return;
        }

        const choice = window.localStorage.getItem("cantek-access-choice");
        setOpen(
          shouldShowFirstVisitGate(
            false,
            choice === "guest" || choice === "account" ? choice : null,
          ),
        );
      } catch {
        if (!active) return;
        const choice = window.localStorage.getItem(
          "cantek-access-choice",
        ) as AccessChoice;
        setOpen(shouldShowFirstVisitGate(false, choice));
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-cantek-dark/85 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Account access"
    >
      <div className="m-auto grid w-full max-w-5xl overflow-hidden border border-white/15 bg-white shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
        <div className="auth-gate-visual hidden min-h-[38rem] flex-col justify-end p-10 text-white lg:flex">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cantek-cyan">
            {t("welcomeKicker")}
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight">
            {t("welcomeTitle")}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-white/80">
            {t("welcomeBody")}
          </p>
        </div>
        <div className="flex items-center justify-center bg-white p-5 sm:p-10">
          <UserAuthCard allowGuest onGuest={() => setOpen(false)} />
        </div>
      </div>
    </div>
  );
}
