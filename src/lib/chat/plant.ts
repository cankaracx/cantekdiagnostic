export const PLANT_OBSERVATIONS = [
  "pullDown",
  "iceCoil",
  "shortCycle",
  "highPressure",
  "doorHeat",
] as const;

export type PlantObservation = (typeof PLANT_OBSERVATIONS)[number];

export type PlantReadings = {
  roomC: number | null;
  setpointC: number | null;
  evaporatorC: number | null;
  compressor: boolean;
  evaporatorFans: boolean;
  defrost: boolean;
  doorOpen: boolean;
  observation: PlantObservation | null;
};

export const EMPTY_PLANT_READINGS: PlantReadings = {
  roomC: null,
  setpointC: null,
  evaporatorC: null,
  compressor: false,
  evaporatorFans: false,
  defrost: false,
  doorOpen: false,
  observation: null,
};

export function parseTemp(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < -80 || value > 80) return null;
  return Math.round(value * 10) / 10;
}

export function formatTemp(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(1);
}

export function pullDownGap(readings: PlantReadings): number | null {
  if (readings.roomC == null || readings.setpointC == null) return null;
  return Math.round((readings.roomC - readings.setpointC) * 10) / 10;
}

export function hasPlantInput(readings: PlantReadings): boolean {
  return (
    readings.roomC != null ||
    readings.setpointC != null ||
    readings.evaporatorC != null ||
    readings.observation != null
  );
}

function formatC(value: number): string {
  const absolute = Math.abs(value).toFixed(1);
  return `${value < 0 ? "-" : ""}${absolute} C`;
}

export function composePlantLookup(
  readings: PlantReadings,
  observationLabel: string,
): string {
  const parts: string[] = ["Octosense cold room readings"];

  if (readings.roomC != null) parts.push(`room air ${formatC(readings.roomC)}`);
  if (readings.setpointC != null) {
    parts.push(`setpoint ${formatC(readings.setpointC)}`);
  }
  if (readings.evaporatorC != null) {
    parts.push(`evaporator ${formatC(readings.evaporatorC)}`);
  }

  const gap = pullDownGap(readings);
  if (gap != null) {
    parts.push(
      gap === 0
        ? "room is at setpoint"
        : gap > 0
          ? `room is ${gap.toFixed(1)} K above setpoint`
          : `room is ${Math.abs(gap).toFixed(1)} K below setpoint`,
    );
  }

  parts.push(
    `compressor ${readings.compressor ? "running" : "off"}`,
    `evaporator fans ${readings.evaporatorFans ? "running" : "off"}`,
    `defrost ${readings.defrost ? "active" : "idle"}`,
    `door ${readings.doorOpen ? "open" : "closed"}`,
  );

  if (observationLabel.trim()) {
    parts.push(`observed ${observationLabel.trim()}`);
  }

  return `${parts.join(". ")}.`;
}
