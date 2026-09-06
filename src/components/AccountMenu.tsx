"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AccountMenu() {
  const t = useTranslations("account");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/user-auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean; email?: string | null }) => {
        if (active && result.authenticated) setEmail(result.email ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!email) {
    return (
      <Link href="/login" className="utility-link font-semibold">
        {t("signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-xs text-cantek-muted sm:inline">
        {email}
      </span>
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/user-auth", { method: "DELETE" });
          window.localStorage.removeItem("cantek-access-choice");
          window.location.reload();
        }}
        className="utility-link font-semibold"
      >
        {t("signOut")}
      </button>
    </div>
  );
}
