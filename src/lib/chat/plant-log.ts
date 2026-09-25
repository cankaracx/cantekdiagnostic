import type { ChatMessage } from "@/lib/rag/types";

export const PLANT_DUTIES = [
  "chill",
  "freeze",
  "blast",
  "pack",
  "unknown",
] as const;

export const PLANT_FAULTS = [
  "pulldown",
  "hp",
  "ice",
  "alarm",
  "oil",
] as const;

export const PLANT_GASES = [
  "r744",
  "r717",
  "r404a",
  "r134a",
  "unknown",
] as const;

export type PlantDuty = (typeof PLANT_DUTIES)[number];
export type PlantFault = (typeof PLANT_FAULTS)[number];
export type PlantGas = (typeof PLANT_GASES)[number];

export type PlantCall = {
  duty: PlantDuty | null;
  fault: PlantFault | null;
  refrigerant: PlantGas;
  serial: string;
};

export const EMPTY_PLANT_CALL: PlantCall = {
  duty: null,
  fault: null,
  refrigerant: "unknown",
  serial: "",
};

const DUTY_QUERY: Record<PlantDuty, string> = {
  chill: "chill room cold room positive storage",
  freeze: "freeze room frozen cold store",
  blast: "blast freezer rapid pulldown tunnel",
  pack: "cooling pack condensing unit compressor rack",
  unknown: "",
};

const FAULT_QUERY: Record<PlantFault, string> = {
  pulldown: "not pulling down high room temperature",
  hp: "HP high pressure HPS condenser",
  ice: "evaporator iced frost defrost DEF",
  alarm: "controller alarm Octosense IRS Octopush",
  oil: "oil lubrication compressor oil level",
};

const GAS_QUERY: Record<PlantGas, string> = {
  r744: "R744 CO2",
  r717: "R717",
  r404a: "R404A",
  r134a: "R134a",
  unknown: "",
};

const DUTY_LABEL: Record<PlantDuty, string> = {
  chill: "chill room",
  freeze: "freeze room",
  blast: "blast freezer",
  pack: "cooling pack",
  unknown: "unspecified room",
};

const FAULT_LABEL: Record<PlantFault, string> = {
  pulldown: "not pulling down",
  hp: "HP / high pressure",
  ice: "iced evaporator",
  alarm: "controller alarm",
  oil: "oil or lubrication",
};

const GAS_LABEL: Record<PlantGas, string> = {
  r744: "R744",
  r717: "R717",
  r404a: "R404A",
  r134a: "R134a",
  unknown: "unknown refrigerant",
};

export function isPlantDuty(value: unknown): value is PlantDuty {
  return typeof value === "string" && PLANT_DUTIES.includes(value as PlantDuty);
}

export function isPlantFault(value: unknown): value is PlantFault {
  return typeof value === "string" && PLANT_FAULTS.includes(value as PlantFault);
}

export function isPlantGas(value: unknown): value is PlantGas {
  return typeof value === "string" && PLANT_GASES.includes(value as PlantGas);
}

export function sanitizePlantCall(input: unknown, fallbackSerial = ""): PlantCall {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const serial = String(raw.serial ?? fallbackSerial)
    .trim()
    .slice(0, 160);
  return {
    duty: isPlantDuty(raw.duty) ? raw.duty : null,
    fault: isPlantFault(raw.fault) ? raw.fault : null,
    refrigerant: isPlantGas(raw.refrigerant) ? raw.refrigerant : "unknown",
    serial,
  };
}

export function plantCallHasLookup(plant: PlantCall): boolean {
  return Boolean(plant.duty && plant.duty !== "unknown" && plant.fault);
}

export function describePlantCall(plant: PlantCall): string {
  const parts: string[] = [];
  if (plant.duty && plant.duty !== "unknown") {
    parts.push(DUTY_LABEL[plant.duty]);
  }
  if (plant.fault) {
    parts.push(FAULT_LABEL[plant.fault]);
  }
  if (plant.refrigerant !== "unknown") {
    parts.push(GAS_LABEL[plant.refrigerant]);
  }
  if (plant.serial.trim()) {
    parts.push(`serial ${plant.serial.trim()}`);
  }
  if (!parts.length) return "";
  const [first, ...rest] = parts;
  return rest.length ? `${first}: ${rest.join(", ")}.` : `${first}.`;
}

export function formatPlantContext(
  plant: PlantCall | null | undefined,
  serial?: string,
): string {
  if (!plant && !serial?.trim()) return "";
  const resolved = sanitizePlantCall(plant, serial);
  const lines = [
    resolved.duty ? `Duty: ${DUTY_LABEL[resolved.duty]}` : null,
    resolved.fault ? `Showing: ${FAULT_LABEL[resolved.fault]}` : null,
    `Refrigerant: ${GAS_LABEL[resolved.refrigerant]}`,
    resolved.serial ? `Serial: ${resolved.serial}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function composePlantQuery(opts: {
  messages: ChatMessage[];
  plant?: PlantCall | null;
  serial?: string;
}): string {
  const lastUser =
    [...opts.messages].reverse().find((message) => message.role === "user")
      ?.content ?? "";
  const prior = opts.messages
    .slice(-6, -1)
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join(" ");
  const plant = sanitizePlantCall(opts.plant, opts.serial);
  const tokens = [
    plant.duty ? DUTY_QUERY[plant.duty] : "",
    plant.fault ? FAULT_QUERY[plant.fault] : "",
    GAS_QUERY[plant.refrigerant],
    plant.serial ? `serial ${plant.serial}` : "",
    prior,
    lastUser,
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  return tokens.join(" ").replace(/\s+/g, " ").slice(0, 4_000);
}

export function excerptFrom(content: string, limit = 280): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit).trimEnd()}…`;
}
