import { localizedChatCopy } from "@/lib/chat/localized";

export const CANTEK_PHONES = "+90 242 258 17 00 / +90 549 743 87 21";

const HAZARD_RE =
  /(ammonia|nh3|welding|weld|brazing|braze|refrigerant recovery|recovering refrigerant|electrical isolation|lockout|tagout|loto|live voltage|live electrical|compressor teardown|charged system|confined space|nitrogen purge|hot work|amonyak|kaynak yap|lehim|soğutucu akışkan geri kazan|elektrik izolasyon|canlı gerilim|kompresör sök|basınçlı sistem|kapalı alan|azot purj|sıcak çalışma|ammoniaque|soudage|brasage|récupération de fluide|tension sous charge|amoníaco|soldadura|recuperación de refrigerante|tensión activa|аммиак|свар|хладагент|напряжени|الأمونيا|لحام|استرداد مادة التبريد|جهد كهربائي|ammoniak|schweiß|kältemittelrückgewinnung|spannung|ammoniaca|saldatura|recupero del refrigerante|tensione|amónia|amônia|soldadura|recuperação de refrigerante|tensão|amoniak|spawanie|odzysk czynnika|napięcie)/i;

const EMERGENCY_RE =
  /(leak|leaking|smell of ammonia|ammonia smell|person down|unconscious|fire|evacuate|explosion|sızıntı|kaçak|amonyak kokusu|bilinçsiz|yangın|tahliye|patlama|fuite|odeur d’ammoniaque|inconscient|incendie|évacuer|explosion|fuga|olor a amoníaco|inconsciente|incendio|evacuar|взрыв|утечк|запах аммиака|без сознания|пожар|эвакуац|تسرب|رائحة الأمونيا|فاقد الوعي|حريق|إخلاء|انفجار|leck|ammoniakgeruch|bewusstlos|brand|evaku|explosion|perdita|odore di ammoniaca|incosciente|incendio|evacu|esplosione|fuga|cheiro de amónia|cheiro de amônia|inconsciente|incêndio|evacuar|explosão|wyciek|zapach amoniaku|nieprzytom|pożar|ewaku|wybuch)/i;

export function isHazardous(text: string): boolean {
  return HAZARD_RE.test(text);
}

export function isEmergency(text: string): boolean {
  return EMERGENCY_RE.test(text);
}

export const DANGER_BLOCK = `DANGER — Stop work. Ammonia, refrigerant, pressure systems, hot work, and electrical equipment can cause fatal injury, fire, explosion, or major equipment damage.`;

export const EMERGENCY_BLOCK = `ACTIVE EMERGENCY — Move away from the hazard, evacuate the area, and call local emergency services and the site emergency team. For a suspected ammonia release, move upwind and do not operate electrical switches or enter the affected area.`;

export const HAZARD_BOUNDARY = `Do not attempt repair, isolation, recovery, charging, hot work, or teardown from online guidance. An authorized and appropriately certified technician must use the exact site manual, risk assessment, permits, and local emergency procedures.`;

export const SERVICE_CLOSE = `Cantek service: ${CANTEK_PHONES} · info@cantekgroup.com`;

export function serviceClose(locale = "en"): string {
  const copy = localizedChatCopy(locale);
  return `${copy.service}: ${CANTEK_PHONES} · info@cantekgroup.com`;
}

export function wrapHazardAnswer(
  _body: string,
  opts: { hazard: boolean; emergency: boolean; locale?: string },
): string {
  const locale = opts.locale ?? "en";
  if (locale !== "en") {
    const copy = localizedChatCopy(locale);
    const parts: string[] = [];
    if (opts.emergency) parts.push(copy.emergency);
    if (opts.hazard) parts.push(`${copy.dangerTitle} — ${copy.dangerBody}`);
    else parts.push(copy.dangerBody);
    parts.push(serviceClose(locale));
    return parts.join("\n\n");
  }

  const parts: string[] = [];
  if (opts.emergency) parts.push(EMERGENCY_BLOCK);
  if (opts.hazard) parts.push(DANGER_BLOCK);
  parts.push(HAZARD_BOUNDARY);
  parts.push(SERVICE_CLOSE);
  return parts.join("\n\n");
}
