"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  composePlantLookup,
  EMPTY_PLANT_READINGS,
  formatTemp,
  hasPlantInput,
  parseTemp,
  PLANT_OBSERVATIONS,
  pullDownGap,
  type PlantObservation,
  type PlantReadings as PlantReadingsValue,
} from "@/lib/chat/plant";

type LampKey = "compressor" | "evaporatorFans" | "defrost" | "doorOpen";

function LcdField({
  id,
  tag,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  tag: string;
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("plant");
  const [draft, setDraft] = useState(formatTemp(value));

  return (
    <label className="octo-lcd" htmlFor={id}>
      <span className="octo-lcd-tag">{tag}</span>
      <span className="octo-lcd-name">{label}</span>
      <span className="octo-lcd-readout">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={draft}
          placeholder="--"
          aria-label={`${label} ${t("unit")}`}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            onChange(parseTemp(next));
          }}
          onBlur={() => setDraft(formatTemp(parseTemp(draft)))}
        />
        <span aria-hidden="true">{t("unit")}</span>
      </span>
    </label>
  );
}

function LampToggle({
  label,
  onText,
  offText,
  pressed,
  tone,
  disabled,
  onToggle,
}: {
  label: string;
  onText: string;
  offText: string;
  pressed: boolean;
  tone: "run" | "heat" | "alarm";
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`octo-lamp octo-lamp-${tone}${pressed ? " is-on" : ""}`}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="octo-lamp-bead" aria-hidden="true" />
      <span className="octo-lamp-copy">
        <span className="octo-lamp-label">{label}</span>
        <span className="octo-lamp-state">{pressed ? onText : offText}</span>
      </span>
    </button>
  );
}

export function PlantReadingsPanel(props: {
  disabled?: boolean;
  onLookup: (query: string, readings: PlantReadingsValue) => void;
}) {
  const t = useTranslations("plant");
  const [readings, setReadings] = useState<PlantReadingsValue>(EMPTY_PLANT_READINGS);
  const gap = pullDownGap(readings);
  const canLookup = hasPlantInput(readings) && !props.disabled;

  const observationLabel = readings.observation
    ? t(readings.observation)
    : "";

  const lamps: {
    key: LampKey;
    label: string;
    onText: string;
    offText: string;
    tone: "run" | "heat" | "alarm";
  }[] = [
    {
      key: "compressor",
      label: t("compressor"),
      onText: t("on"),
      offText: t("off"),
      tone: "run",
    },
    {
      key: "evaporatorFans",
      label: t("fans"),
      onText: t("on"),
      offText: t("off"),
      tone: "run",
    },
    {
      key: "defrost",
      label: t("defrost"),
      onText: t("active"),
      offText: t("idle"),
      tone: "heat",
    },
    {
      key: "doorOpen",
      label: t("door"),
      onText: t("open"),
      offText: t("closed"),
      tone: "alarm",
    },
  ];

  const gapText = useMemo(() => {
    if (gap == null) return null;
    if (gap === 0) return t("atSetpoint");
    if (gap > 0) return t("aboveSetpoint", { gap: gap.toFixed(1) });
    return t("belowSetpoint", { gap: Math.abs(gap).toFixed(1) });
  }, [gap, t]);

  function setLamp(key: LampKey) {
    setReadings((current) => ({ ...current, [key]: !current[key] }));
  }

  function setObservation(next: PlantObservation) {
    setReadings((current) => ({
      ...current,
      observation: current.observation === next ? null : next,
    }));
  }

  return (
    <section className="octo-panel" aria-labelledby="octo-panel-title">
      <header className="octo-panel-head">
        <div>
          <p className="octo-brand">Octosense</p>
          <h3 id="octo-panel-title" className="octo-title">
            {t("title")}
          </h3>
        </div>
        <p className="octo-intro">{t("intro")}</p>
      </header>

      <div className="octo-lcd-row">
        <LcdField
          id="octo-room"
          tag={t("roomTag")}
          label={t("room")}
          value={readings.roomC}
          disabled={props.disabled}
          onChange={(roomC) => setReadings((current) => ({ ...current, roomC }))}
        />
        <LcdField
          id="octo-set"
          tag={t("setTag")}
          label={t("setpoint")}
          value={readings.setpointC}
          disabled={props.disabled}
          onChange={(setpointC) =>
            setReadings((current) => ({ ...current, setpointC }))
          }
        />
        <LcdField
          id="octo-evap"
          tag={t("evapTag")}
          label={t("evaporator")}
          value={readings.evaporatorC}
          disabled={props.disabled}
          onChange={(evaporatorC) =>
            setReadings((current) => ({ ...current, evaporatorC }))
          }
        />
      </div>

      {gapText ? <p className="octo-gap">{gapText}</p> : null}

      <p className="octo-section-label">{t("outputs")}</p>
      <div className="octo-lamp-row">
        {lamps.map((lamp) => (
          <LampToggle
            key={lamp.key}
            label={lamp.label}
            onText={lamp.onText}
            offText={lamp.offText}
            pressed={readings[lamp.key]}
            tone={lamp.tone}
            disabled={props.disabled}
            onToggle={() => setLamp(lamp.key)}
          />
        ))}
      </div>

      <p className="octo-section-label">{t("observation")}</p>
      <div className="octo-fault-row">
        {PLANT_OBSERVATIONS.map((key) => (
          <button
            key={key}
            type="button"
            className={`octo-fault${readings.observation === key ? " is-selected" : ""}`}
            aria-pressed={readings.observation === key}
            disabled={props.disabled}
            onClick={() => setObservation(key)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="octo-actions">
        <button
          type="button"
          className="octo-lookup"
          disabled={!canLookup}
          onClick={() =>
            props.onLookup(composePlantLookup(readings, observationLabel), readings)
          }
        >
          {t("lookup")}
        </button>
        <p>{t("orType")}</p>
      </div>
    </section>
  );
}

export function PlantDocket({ readings }: { readings: PlantReadingsValue }) {
  const t = useTranslations("plant");
  const cells = [
    readings.roomC != null ? `${t("roomTag")} ${formatTemp(readings.roomC)}` : null,
    readings.setpointC != null
      ? `${t("setTag")} ${formatTemp(readings.setpointC)}`
      : null,
    readings.evaporatorC != null
      ? `${t("evapTag")} ${formatTemp(readings.evaporatorC)}`
      : null,
    readings.compressor ? t("compressor") : null,
    readings.evaporatorFans ? t("fans") : null,
    readings.defrost ? t("defrost") : null,
    readings.doorOpen ? t("door") : null,
    readings.observation ? t(readings.observation) : null,
  ].filter(Boolean);

  if (!cells.length) return null;

  return (
    <p className="octo-docket">
      <span>{t("docket")}</span>
      {cells.map((cell) => (
        <span key={cell}>{cell}</span>
      ))}
    </p>
  );
}
