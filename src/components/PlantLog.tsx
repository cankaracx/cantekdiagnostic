"use client";

import { useTranslations } from "next-intl";
import {
  EMPTY_READINGS,
  OBSERVATIONS_BY_FAULT,
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
  type PlantReadings,
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

function ReadingsPlate(props: {
  plant: PlantCall;
  onChange: (plant: PlantCall) => void;
  legend: string;
  roomLabel: string;
  setLabel: string;
  codeLabel: string;
  unit: string;
  codeHint: string;
}) {
  const readings = props.plant.readings ?? EMPTY_READINGS;

  function patch(partial: Partial<PlantReadings>) {
    props.onChange({
      ...props.plant,
      readings: { ...readings, ...partial },
    });
  }

  return (
    <fieldset className="plant-log-fieldset">
      <legend className="plant-log-legend">{props.legend}</legend>
      <div className="plant-readings-plate">
        <label className="plant-reading">
          <span className="plant-reading-key">{props.roomLabel}</span>
          <span className="plant-reading-value">
            <input
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              placeholder="—"
              aria-label={props.roomLabel}
              value={readings.roomC}
              onChange={(event) => patch({ roomC: event.target.value })}
            />
            <span className="plant-reading-unit">{props.unit}</span>
          </span>
        </label>
        <label className="plant-reading">
          <span className="plant-reading-key">{props.setLabel}</span>
          <span className="plant-reading-value">
            <input
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              placeholder="—"
              aria-label={props.setLabel}
              value={readings.setC}
              onChange={(event) => patch({ setC: event.target.value })}
            />
            <span className="plant-reading-unit">{props.unit}</span>
          </span>
        </label>
        <label className="plant-reading">
          <span className="plant-reading-key">{props.codeLabel}</span>
          <span className="plant-reading-value">
            <input
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              placeholder={props.codeHint}
              aria-label={props.codeLabel}
              value={readings.displayCode}
              onChange={(event) =>
                patch({ displayCode: event.target.value.toUpperCase() })
              }
            />
          </span>
        </label>
      </div>
    </fieldset>
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

  const readingsPlate = (
    <ReadingsPlate
      plant={plant}
      onChange={props.onChange}
      legend={t("readings")}
      roomLabel={t("room")}
      setLabel={t("set")}
      codeLabel={t("code")}
      unit={t("roomUnit")}
      codeHint={t("codeHint")}
    />
  );

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
      <div className="plant-log">
        <div className="plant-log-compact">
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
        <div className="plant-log-body plant-log-body-compact">
          {readingsPlate}
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
        {readingsPlate}
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
