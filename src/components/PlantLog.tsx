"use client";

import { useTranslations } from "next-intl";
import {
  PLANT_DUTIES,
  PLANT_FAULTS,
  PLANT_GASES,
  plantCallHasLookup,
  type PlantCall,
  type PlantDuty,
  type PlantFault,
  type PlantGas,
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
      plant.serial.trim() || null,
    ].filter(Boolean);

    return (
      <div className="plant-log plant-log-compact">
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
          onChange={(fault: PlantFault) => props.onChange({ ...plant, fault })}
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
