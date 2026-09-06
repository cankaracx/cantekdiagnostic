export const CANTEK_PHONES = "+90 242 258 17 00 / +90 549 743 87 21";

const HAZARD_RE =
  /\b(ammonia|\bnh3\b|welding|weld|brazing|braze|refrigerant recovery|recover(ing)? refrigerant|electrical isolation|lockout|tagout|loto|live voltage|live electrical|compressor teardown|charged system|confined space|nitrogen purge|hot work)\b/i;

const EMERGENCY_RE =
  /\b(leak|leaking|smell of ammonia|ammonia smell|person down|unconscious|fire|evacuate|explosion)\b/i;

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

export function wrapHazardAnswer(_body: string, opts: { hazard: boolean; emergency: boolean }): string {
  const parts: string[] = [];
  if (opts.emergency) parts.push(EMERGENCY_BLOCK);
  if (opts.hazard) parts.push(DANGER_BLOCK);
  parts.push(HAZARD_BOUNDARY);
  parts.push(SERVICE_CLOSE);
  return parts.join("\n\n");
}
