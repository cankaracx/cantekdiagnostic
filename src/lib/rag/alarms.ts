/** Tokens that appear on Cantek / Carel / Dixell plant controllers. */
export const ALARM_TOKEN_PATTERN =
  /\b(?:[EAHLF][A-Z]?\d{1,3}|HP|LP|HPS|LPS|HT|LT|NH3|HI|LO|CHT|DEF)\b/gi;

export function extractAlarmTokens(query: string): string[] {
  return [
    ...new Set(
      (query.match(ALARM_TOKEN_PATTERN) ?? []).map((token) =>
        token.toUpperCase(),
      ),
    ),
  ];
}

export function normalizeAlarmCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function excerptManualPassage(content: string, maxLength = 240): string {
  const cleaned = content
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const clipped = (lastSpace > maxLength * 0.65 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${clipped}…`;
}

export const FAULT_LAMPS = ["hp", "lp", "hi", "defrost"] as const;
export type FaultLamp = (typeof FAULT_LAMPS)[number];

export function composeFaultQuery(
  lamps: FaultLamp[],
  code: string,
  copy: Record<FaultLamp | "code", string>,
): string {
  const parts = lamps.map((lamp) => copy[lamp]).filter(Boolean);
  const alarm = normalizeAlarmCode(code);
  if (alarm) {
    parts.push(copy.code.replaceAll("{code}", alarm));
  }
  return parts.join(" ").trim();
}
