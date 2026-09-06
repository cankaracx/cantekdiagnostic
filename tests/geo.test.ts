import { describe, expect, it } from "vitest";
import { detectLocale, localeFromCountry } from "@/lib/geo/locales";

describe("geo locales", () => {
  it("maps Cantek markets to UI locales", () => {
    expect(localeFromCountry("TR")).toBe("tr");
    expect(localeFromCountry("AE")).toBe("ar");
    expect(localeFromCountry("ML")).toBe("fr");
    expect(localeFromCountry("KZ")).toBe("ru");
    expect(localeFromCountry("CU")).toBe("es");
    expect(localeFromCountry("GB")).toBe("en");
  });

  it("prefers cookie over IP over Accept-Language", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "TR",
      "accept-language": "fr",
    });
    expect(detectLocale(headers, "es")).toBe("es");
    expect(detectLocale(headers, null)).toBe("tr");
  });
});
