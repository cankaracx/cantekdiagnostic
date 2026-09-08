import type { ChatMessage } from "@/lib/rag/types";

export const PLANT_EQUIPMENT_IDS = [
  "cold-room",
  "blast",
  "ice",
  "pack",
  "controller",
] as const;

export type PlantEquipmentId = (typeof PLANT_EQUIPMENT_IDS)[number];

export const PLANT_FAULT_IDS = [
  "pull-down",
  "high-pressure",
  "ice-build",
  "short-cycle",
  "alarm",
  "oil",
] as const;

export type PlantFaultId = (typeof PLANT_FAULT_IDS)[number];

export type PlantContext = {
  equipment?: PlantEquipmentId;
  fault?: PlantFaultId;
  serial?: string;
};

const EQUIPMENT_QUERY_TERMS: Record<PlantEquipmentId, string> = {
  "cold-room": "cold room coldroom soğuk oda",
  blast: "blast freezer shock freezer şok tünel",
  ice: "ice plant flake ice buz tesisi",
  pack: "cooling pack compressor rack soğutma grubu",
  controller: "Octosense IRS Octopush controller",
};

const FAULT_QUERY_TERMS: Record<PlantFaultId, string> = {
  "pull-down": "not pulling down temperature not dropping pull-down",
  "high-pressure": "high pressure HP alarm HPS discharge pressure",
  "ice-build": "ice on evaporator frost coil icing",
  "short-cycle": "short cycling short-cycle compressor starts stops",
  alarm: "controller alarm Octosense alarm code",
  oil: "oil lubrication oil pressure oil return",
};

const EQUIPMENT_FILTER_TERMS: Record<PlantEquipmentId, string> = {
  "cold-room": "cold room",
  blast: "blast",
  ice: "ice",
  pack: "pack",
  controller: "octosense",
};

export function isPlantEquipment(value: unknown): value is PlantEquipmentId {
  return (
    typeof value === "string" &&
    (PLANT_EQUIPMENT_IDS as readonly string[]).includes(value)
  );
}

export function isPlantFault(value: unknown): value is PlantFaultId {
  return (
    typeof value === "string" &&
    (PLANT_FAULT_IDS as readonly string[]).includes(value)
  );
}

export function parsePlantContext(input: {
  equipment?: unknown;
  fault?: unknown;
  serial?: unknown;
}): PlantContext {
  const serial =
    typeof input.serial === "string" ? input.serial.trim().slice(0, 80) : "";
  return {
    equipment: isPlantEquipment(input.equipment) ? input.equipment : undefined,
    fault: isPlantFault(input.fault) ? input.fault : undefined,
    serial: serial || undefined,
  };
}

export function equipmentSearchTerm(
  equipment: PlantEquipmentId | undefined,
): string | undefined {
  return equipment ? EQUIPMENT_FILTER_TERMS[equipment] : undefined;
}

export function conversationWindow(
  messages: ChatMessage[],
  limit = 8,
): ChatMessage[] {
  const merged: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const content = message.content.trim().slice(0, 4_000);
    if (!content) continue;
    const last = merged.at(-1);
    if (last && last.role === message.role) {
      last.content = `${last.content}\n${content}`.slice(0, 4_000);
      continue;
    }
    merged.push({ role: message.role, content });
  }

  while (merged.length && merged[0]?.role !== "user") {
    merged.shift();
  }

  const windowed = merged.slice(-limit);
  while (windowed.length && windowed[0]?.role !== "user") {
    windowed.shift();
  }
  return windowed;
}

export function buildRetrievalQuery(
  messages: ChatMessage[],
  plant: PlantContext = {},
): string {
  const users = messages.filter((message) => message.role === "user");
  const lastUser = users.at(-1)?.content.trim() ?? "";
  const prior = users
    .slice(0, -1)
    .slice(-2)
    .map((message) => message.content.trim().slice(0, 240))
    .filter(Boolean);
  const plantBits = [
    plant.equipment ? EQUIPMENT_QUERY_TERMS[plant.equipment] : "",
    plant.fault ? FAULT_QUERY_TERMS[plant.fault] : "",
    plant.serial ? `model serial ${plant.serial}` : "",
  ].filter(Boolean);

  return [lastUser, ...prior, ...plantBits]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4_000);
}

export function describePlantForPrompt(plant: PlantContext): string | null {
  const lines = [
    plant.equipment
      ? `Equipment family: ${EQUIPMENT_QUERY_TERMS[plant.equipment]}`
      : "",
    plant.fault ? `Observed fault: ${FAULT_QUERY_TERMS[plant.fault]}` : "",
    plant.serial ? `Model/serial: ${plant.serial}` : "",
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}
