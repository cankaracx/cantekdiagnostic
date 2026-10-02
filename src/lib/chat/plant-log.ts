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

export const PLANT_OBSERVATIONS = [
  "fans",
  "blocked",
  "ambient",
  "defrost",
  "door",
  "airflow",
  "loaded",
  "setpoint",
  "running",
  "code",
  "whichUnit",
  "returned",
  "sight",
  "noise",
  "cycling",
] as const;

export type PlantDuty = (typeof PLANT_DUTIES)[number];
export type PlantFault = (typeof PLANT_FAULTS)[number];
export type PlantGas = (typeof PLANT_GASES)[number];
export type PlantObservation = (typeof PLANT_OBSERVATIONS)[number];

export type PlantCall = {
  duty: PlantDuty | null;
  fault: PlantFault | null;
  refrigerant: PlantGas;
  serial: string;
  observations: PlantObservation[];
};

export type PlantCallLabels = {
  duty?: Record<PlantDuty, string>;
  fault?: Record<PlantFault, string>;
  gas?: Record<PlantGas, string>;
  observation?: Record<PlantObservation, string>;
  serial?: (value: string) => string;
};

export const EMPTY_PLANT_CALL: PlantCall = {
  duty: null,
  fault: null,
  refrigerant: "unknown",
  serial: "",
  observations: [],
};

export const OBSERVATIONS_BY_FAULT: Record<
  PlantFault,
  readonly PlantObservation[]
> = {
  hp: ["fans", "blocked", "ambient"],
  ice: ["defrost", "door", "airflow"],
  pulldown: ["loaded", "setpoint", "running"],
  alarm: ["code", "whichUnit", "returned"],
  oil: ["sight", "noise", "cycling"],
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

const OBSERVATION_QUERY: Record<PlantObservation, string> = {
  fans: "condenser fans running condenser fan motor",
  blocked: "condenser blocked dirty coil airflow",
  ambient: "high ambient outdoor temperature condenser",
  defrost: "defrost DEF evaporator frost overdue",
  door: "door open infiltration air curtain",
  airflow: "evaporator fans airflow blocked",
  loaded: "product load pulldown warm goods",
  setpoint: "setpoint SET room temperature changed",
  running: "compressor running continuous pack",
  code: "controller alarm code display HP LP DEF E0",
  whichUnit: "room circuit pack which unit alarm",
  returned: "alarm reset returned recurring",
  sight: "oil sight glass lubrication level",
  noise: "compressor noise knocking vibration",
  cycling: "short cycling compressor cut-out",
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

const OBSERVATION_LABEL: Record<PlantObservation, string> = {
  fans: "condenser fans running",
  blocked: "condenser dirty or blocked",
  ambient: "pack in high outdoor heat",
  defrost: "defrost overdue or stuck",
  door: "door or curtain leaking air",
  airflow: "evaporator air blocked",
  loaded: "warm product just loaded",
  setpoint: "setpoint recently changed",
  running: "pack running without stopping",
  code: "alarm code still on the display",
  whichUnit: "which room or circuit is in alarm",
  returned: "alarm cleared and came back",
  sight: "oil sight glass looks low",
  noise: "compressor noisy or knocking",
  cycling: "compressor short-cycling",
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

export function isPlantObservation(value: unknown): value is PlantObservation {
  return (
    typeof value === "string" &&
    PLANT_OBSERVATIONS.includes(value as PlantObservation)
  );
}

export function observationsForFault(
  fault: PlantFault | null,
): readonly PlantObservation[] {
  return fault ? OBSERVATIONS_BY_FAULT[fault] : [];
}

export function sanitizePlantCall(
  input: unknown,
  fallbackSerial = "",
): PlantCall {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const serial = String(raw.serial ?? fallbackSerial)
    .trim()
    .slice(0, 160);
  const fault = isPlantFault(raw.fault) ? raw.fault : null;
  const allowed = observationsForFault(fault);
  const observations = Array.isArray(raw.observations)
    ? raw.observations
        .filter(
          (value): value is PlantObservation =>
            isPlantObservation(value) && allowed.includes(value),
        )
        .filter((value, index, list) => list.indexOf(value) === index)
        .slice(0, 6)
    : [];
  return {
    duty: isPlantDuty(raw.duty) ? raw.duty : null,
    fault,
    refrigerant: isPlantGas(raw.refrigerant) ? raw.refrigerant : "unknown",
    serial,
    observations,
  };
}

export function toggleObservation(
  plant: PlantCall,
  observation: PlantObservation,
): PlantCall {
  const allowed = observationsForFault(plant.fault);
  if (!allowed.includes(observation)) return plant;
  const selected = plant.observations.includes(observation)
    ? plant.observations.filter((item) => item !== observation)
    : [...plant.observations, observation];
  return { ...plant, observations: selected };
}

export function plantCallHasLookup(plant: PlantCall): boolean {
  return Boolean(plant.duty && plant.duty !== "unknown" && plant.fault);
}

export function describePlantCall(
  plant: PlantCall,
  labels?: PlantCallLabels,
): string {
  const dutyLabels = labels?.duty ?? DUTY_LABEL;
  const faultLabels = labels?.fault ?? FAULT_LABEL;
  const gasLabels = labels?.gas ?? GAS_LABEL;
  const observationLabels = labels?.observation ?? OBSERVATION_LABEL;
  const serialLabel =
    labels?.serial ?? ((value: string) => `serial ${value}`);
  const parts: string[] = [];
  if (plant.duty && plant.duty !== "unknown") {
    parts.push(dutyLabels[plant.duty]);
  }
  if (plant.fault) {
    parts.push(faultLabels[plant.fault]);
  }
  if (plant.refrigerant !== "unknown") {
    parts.push(gasLabels[plant.refrigerant]);
  }
  for (const observation of plant.observations) {
    parts.push(observationLabels[observation]);
  }
  if (plant.serial.trim()) {
    parts.push(serialLabel(plant.serial.trim()));
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
  const observationLine = resolved.observations
    .map((observation) => OBSERVATION_LABEL[observation])
    .join("; ");
  const lines = [
    resolved.duty ? `Duty: ${DUTY_LABEL[resolved.duty]}` : null,
    resolved.fault ? `Showing: ${FAULT_LABEL[resolved.fault]}` : null,
    `Refrigerant: ${GAS_LABEL[resolved.refrigerant]}`,
    observationLine ? `Seen on plant: ${observationLine}` : null,
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
    ...plant.observations.map((observation) => OBSERVATION_QUERY[observation]),
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
