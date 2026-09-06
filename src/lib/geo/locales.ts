import type { AppLocale } from "@/i18n/routing";
import { locales, routing } from "@/i18n/routing";

const COUNTRY_TO_LOCALE: Record<string, AppLocale> = {
  TR: "tr",
  GB: "en",
  UK: "en",
  NG: "en",
  GH: "en",
  KE: "en",
  US: "en",
  IE: "en",
  AU: "en",
  ZA: "en",
  IN: "en",
  PK: "en",
  AE: "ar",
  SA: "ar",
  IQ: "ar",
  EG: "ar",
  SD: "ar",
  MR: "ar",
  QA: "ar",
  OM: "ar",
  JO: "ar",
  LB: "ar",
  LY: "ar",
  BH: "ar",
  KW: "ar",
  YE: "ar",
  PS: "ar",
  MA: "fr",
  DZ: "fr",
  TN: "fr",
  ML: "fr",
  SN: "fr",
  TD: "fr",
  NE: "fr",
  CI: "fr",
  BF: "fr",
  FR: "fr",
  BE: "fr",
  RU: "ru",
  KZ: "ru",
  UZ: "ru",
  GE: "ru",
  BY: "ru",
  KG: "ru",
  TM: "ru",
  AZ: "ru",
  CU: "es",
  MX: "es",
  ES: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  IL: "en",
  KR: "en",
  IR: "en",
  RO: "en",
  BG: "en",
  GR: "en",
};

export const RTL_LOCALES = new Set<AppLocale>(["ar"]);

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function localeFromCountry(country: string | null | undefined): AppLocale | null {
  if (!country) return null;
  return COUNTRY_TO_LOCALE[country.trim().toUpperCase()] ?? null;
}

export function localeFromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number(q.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const short = tag.split("-")[0];
    if (isAppLocale(short)) return short;
  }
  return null;
}

export function countryFromRequestHeaders(headers: Headers): string | null {
  return (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code")
  );
}

/** Cookie > IP country > Accept-Language > default. */
export function detectLocale(headers: Headers, cookieLocale?: string | null): AppLocale {
  if (isAppLocale(cookieLocale)) return cookieLocale;
  const fromCountry = localeFromCountry(countryFromRequestHeaders(headers));
  if (fromCountry) return fromCountry;
  return localeFromAcceptLanguage(headers.get("accept-language")) ?? routing.defaultLocale;
}

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  fr: "Français",
  ru: "Русский",
  es: "Español",
};
