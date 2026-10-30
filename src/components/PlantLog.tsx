"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  formatBar,
  OBSERVATIONS_BY_FAULT,
  parseBar,
  PLANT_DUTIES,
  PLANT_FAULTS,
  PLANT_GASES,
  plantCallHasLookup,
  toggleObservation,
  type PlantCall,
  type PlantDuty,
  type PlantFault,
  type PlantGas,
  type PlantObservation,
} from "@/lib/chat/plant-log";

function OptionRow<T extends string>(props: {
  legend: string;
  values: readonly T[];
  value: T | null;
  labelFor: (value: T) => string;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <fieldset className="plant-log-fieldset">
      <legend className="plant-log-legend">{props.legend}</legend>
      <div className="plant-log-options">
        {props.values.map((option) => {
          const selected = props.value === option;
          return (
            <label
              key={option}
              className={`plant-log-option ${selected ? "plant-log-option-on" : ""}`}
            >
              <input
                type="radio"
                name={props.name}
                value={option}
                checked={selected}
                onChange={() => props.onChange(option)}
              />
              <span>{props.labelFor(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function GaugeBoard(props: {
  plant: PlantCall;
  compact?: boolean;
  onChange: (plant: PlantCall) => void;
  onSubmit?: () => void;
}) {
  const t = useTranslations("plant");
  const [draft, setDraft] = useState({
    suction: props.plant.suctionBar == null ? "" : formatBar(props.plant.suctionBar),
    discharge:
      props.plant.dischargeBar == null ? "" : formatBar(props.plant.dischargeBar),
  });

  function isCompleteDraft(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return true;
    if (trimmed.endsWith(".") || trimmed.endsWith(",")) return false;
    return parseBar(trimmed) != null;
  }

  function commit(field: "suctionBar" | "dischargeBar", raw: string, revert = false) {
    const parsed = parseBar(raw);
    if (raw.trim() !== "" && parsed == null) {
      if (!revert) return;
      setDraft((current) => ({
        ...current,
        [field === "suctionBar" ? "suction" : "discharge"]:
          props.plant[field] == null ? "" : formatBar(props.plant[field]!),
      }));
      return;
    }
    if (parsed === props.plant[field]) return;
    props.onChange({ ...props.plant, [field]: parsed });
  }

  return (
    <div
      className={`pack-gauges ${props.compact ? "pack-gauges-compact" : ""}`}
      role="group"
      aria-label={t("gauges")}
    >
      {!props.compact && (
        <div className="pack-gauges-head">
          <p className="plant-log-legend pack-gauges-legend">{t("gauges")}</p>
          <p className="pack-gauges-lead">{t("gaugesLead")}</p>
        </div>
      )}
      <div className="pack-gauges-wells">
        <label
          className={`pack-gauge ${props.plant.suctionBar != null ? "pack-gauge-lit" : ""}`}
        >
          <span className="pack-gauge-lamp" aria-hidden="true" />
          <span className="pack-gauge-tag">{t("suction")}</span>
          <input
            dir="ltr"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label={t("suction")}
            placeholder={t("suctionHint")}
            value={draft.suction}
            onChange={(event) => {
              const next = event.target.value;
              setDraft((current) => ({ ...current, suction: next }));
              if (isCompleteDraft(next)) commit("suctionBar", next);
            }}
            onBlur={(event) => commit("suctionBar", event.target.value, true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit("suctionBar", event.currentTarget.value, true);
                props.onSubmit?.();
              }
            }}
          />
          <span className="pack-gauge-unit">{t("bar")}</span>
        </label>
        <label
          className={`pack-gauge pack-gauge-hp ${props.plant.dischargeBar != null ? "pack-gauge-lit" : ""}`}
        >
          <span className="pack-gauge-lamp" aria-hidden="true" />
          <span className="pack-gauge-tag">{t("discharge")}</span>
          <input
            dir="ltr"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label={t("discharge")}
            placeholder={t("dischargeHint")}
            value={draft.discharge}
            onChange={(event) => {
              const next = event.target.value;
              setDraft((current) => ({ ...current, discharge: next }));
              if (isCompleteDraft(next)) commit("dischargeBar", next);
            }}
            onBlur={(event) => commit("dischargeBar", event.target.value, true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit("dischargeBar", event.currentTarget.value, true);
                props.onSubmit?.();
              }
            }}
          />
          <span className="pack-gauge-unit">{t("bar")}</span>
        </label>
      </div>
    </div>
  );
}

function ObservationRow(props: {
  plant: PlantCall;
  onChange: (plant: PlantCall) => void;
  legend: string;
  labelFor: (value: PlantObservation) => string;
}) {
  const options = props.plant.fault
    ? OBSERVATIONS_BY_FAULT[props.plant.fault]
    : [];
  if (!options.length) return null;

  return (
    <fieldset className="plant-log-fieldset">
      <legend className="plant-log-legend">{props.legend}</legend>
      <div className="plant-log-options">
        {options.map((option) => {
          const selected = props.plant.observations.includes(option);
          return (
            <label
              key={option}
              className={`plant-log-option ${selected ? "plant-log-option-on" : ""}`}
            >
              <input
                type="checkbox"
                name="plant-observation"
                value={option}
                checked={selected}
                onChange={() =>
                  props.onChange(toggleObservation(props.plant, option))
                }
              />
              <span>{props.labelFor(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PlantLog(props: {
  plant: PlantCall;
  serialLocked?: boolean;
  compact?: boolean;
  onChange: (plant: PlantCall) => void;
  onLookup: () => void;
  onNewCall: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("plant");
  const service = useTranslations("home");
  const { plant } = props;
  const canLookup = plantCallHasLookup(plant);

  if (props.compact) {
    const summary = [
      plant.duty ? t(`duties.${plant.duty}`) : null,
      plant.fault ? t(`faults.${plant.fault}`) : null,
      plant.refrigerant !== "unknown" ? t(`gases.${plant.refrigerant}`) : null,
      ...plant.observations.map((observation) =>
        t(`observations.${observation}`),
      ),
      plant.serial.trim() || null,
    ].filter(Boolean);

    return (
      <div className="plant-log plant-log-compact">
        <div className="plant-log-compact-head">
          <div className="min-w-0">
            <p className="plant-log-kicker">{t("logged")}</p>
            <p className="plant-log-summary">
              {summary.length ? summary.join(" — ") : t("title")}
            </p>
          </div>
          <button type="button" className="plant-log-ghost" onClick={props.onNewCall}>
            {t("newCall")}
          </button>
        </div>
        <GaugeBoard
          plant={plant}
          compact
          onChange={props.onChange}
          onSubmit={canLookup ? props.onLookup : undefined}
        />
      </div>
    );
  }

  return (
    <div className="plant-log">
      <div className="plant-log-fascia">
        <div>
          <p className="plant-log-kicker">{service("service")}</p>
          <h3 className="plant-log-title">{t("title")}</h3>
        </div>
        <p className="plant-log-site">Antalya</p>
      </div>
      <div className="plant-log-body">
        <p className="plant-log-lead">{t("lead")}</p>
        <OptionRow
          name="plant-duty"
          legend={t("duty")}
          values={PLANT_DUTIES}
          value={plant.duty}
          labelFor={(value) => t(`duties.${value}`)}
          onChange={(duty: PlantDuty) => props.onChange({ ...plant, duty })}
        />
        <OptionRow
          name="plant-fault"
          legend={t("fault")}
          values={PLANT_FAULTS}
          value={plant.fault}
          labelFor={(value) => t(`faults.${value}`)}
          onChange={(fault: PlantFault) =>
            props.onChange({ ...plant, fault, observations: [] })
          }
        />
        <ObservationRow
          plant={plant}
          onChange={props.onChange}
          legend={t("asks")}
          labelFor={(value) => t(`observations.${value}`)}
        />
        <GaugeBoard
          plant={plant}
          onChange={props.onChange}
          onSubmit={canLookup ? props.onLookup : undefined}
        />
        <div className="plant-log-split">
          <OptionRow
            name="plant-gas"
            legend={t("refrigerant")}
            values={PLANT_GASES}
            value={plant.refrigerant}
            labelFor={(value) => t(`gases.${value}`)}
            onChange={(refrigerant: PlantGas) =>
              props.onChange({ ...plant, refrigerant })
            }
          />
          <label className="plant-log-serial">
            <span className="plant-log-legend">{t("serial")}</span>
            <input
              value={plant.serial}
              readOnly={props.serialLocked}
              maxLength={160}
              placeholder={t("serialHint")}
              onChange={(event) =>
                props.onChange({ ...plant, serial: event.target.value })
              }
            />
          </label>
        </div>
        <div className="plant-log-actions">
          <button
            type="button"
            className="plant-log-lookup"
            disabled={props.busy || !canLookup}
            onClick={props.onLookup}
          >
            {t("lookup")}
          </button>
        </div>
      </div>
    </div>
  );
}
