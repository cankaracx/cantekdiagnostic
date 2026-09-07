import { defineRouting } from "next-intl/routing";

export const locales = [
  "en",
  "tr",
  "ar",
  "fr",
  "ru",
  "es",
  "de",
  "it",
  "pt",
  "pl",
] as const;
export type AppLocale = (typeof locales)[number];

export const localeCookieName = "CANTEK_LOCALE";

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: localeCookieName,
    maxAge: 60 * 60 * 24 * 365,
  },
});
