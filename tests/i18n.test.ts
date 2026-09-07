import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import ar from "@/messages/ar.json";
import fr from "@/messages/fr.json";
import ru from "@/messages/ru.json";
import es from "@/messages/es.json";
import de from "@/messages/de.json";
import itMessages from "@/messages/it.json";
import pt from "@/messages/pt.json";
import pl from "@/messages/pl.json";

const messages = {
  en,
  tr,
  ar,
  fr,
  ru,
  es,
  de,
  it: itMessages,
  pt,
  pl,
};

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object"
      ? keys(child as object, path)
      : [path];
  });
}

describe("message catalogs", () => {
  it("has a complete catalog for every routed locale", () => {
    expect(Object.keys(messages)).toEqual([...locales]);
    const expected = keys(en).sort();
    for (const locale of locales) {
      expect(keys(messages[locale]).sort(), locale).toEqual(expected);
    }
  });

  it("does not expose implementation or model branding in interface copy", () => {
    for (const [locale, catalog] of Object.entries(messages)) {
      const copy = JSON.stringify(catalog);
      expect(copy, locale).not.toMatch(/\b(?:RAG|Claude|chatbot)\b/i);
    }
  });
});
