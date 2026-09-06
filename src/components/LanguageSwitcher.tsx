"use client";

import { localeLabels } from "@/lib/geo/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-cantek-muted">
      <span className="sr-only">{t("language")}</span>
      <select
        className="border border-cantek-border bg-white px-2 py-1 text-xs font-semibold text-cantek-dark"
        value={locale}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          router.replace(pathname, { locale: next });
        }}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
