"use client";

import { useTranslations } from "next-intl";
import {
  OBSERVATIONS_BY_FAULT,
  PLANT_DURATIONS,
  PLANT_DUTIES,
  PLANT_FAULTS,
  PLANT_GASES,
  plantCallHasLookup,
  toggleObservation,
  type PlantCall,
  type PlantDuration,
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
              onClick={() => props.onChange(option)}
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
  onCopyCall?: () => void;
  copied?: boolean;
  busy?: boolean;
}) {
  const t = useTranslations("plant");
  const service = useTranslations("home");
  const { plant } = props;
  const canLookup = plantCallHasLookup(plant);

  if (props.compact) {
    const seen = plant.observations
      .map((observation) => t(`observations.${observation}`))
      .join("; ");

    return (
      <div className="plant-log plant-log-slip">
        <div className="plant-log-fascia">
          <div>
            <p className="plant-log-kicker">{service("service")}</p>
            <h3 className="plant-log-title">{t("logged")}</h3>
          </div>
          <p className="plant-log-site">Antalya</p>
        </div>
        <div className="dispatch-slip">
          <div className="dispatch-clock">
            <p className="dispatch-clock-label">{t("since")}</p>
            <p className="dispatch-clock-value">
              {plant.duration
                ? t(`durations.${plant.duration}`)
                : t("durations.unknown")}
            </p>
          </div>
          <dl className="dispatch-facts">
            {plant.duty && plant.duty !== "unknown" ? (
              <div>
                <dt>{t("duty")}</dt>
                <dd>{t(`duties.${plant.duty}`)}</dd>
              </div>
            ) : null}
            {plant.fault ? (
              <div>
                <dt>{t("fault")}</dt>
                <dd>{t(`faults.${plant.fault}`)}</dd>
              </div>
            ) : null}
            {plant.refrigerant !== "unknown" ? (
              <div>
                <dt>{t("refrigerant")}</dt>
                <dd>{t(`gases.${plant.refrigerant}`)}</dd>
              </div>
            ) : null}
            {plant.serial.trim() ? (
              <div>
                <dt>{t("serial")}</dt>
                <dd>{plant.serial.trim()}</dd>
              </div>
            ) : null}
            {seen ? (
              <div className="dispatch-facts-span">
                <dt>{t("asks")}</dt>
                <dd>{seen}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="dispatch-actions">
          <a className="plant-log-lookup" href="tel:+902422581700">
            {t("callCantek")}
          </a>
          <button
            type="button"
            className="plant-log-ghost"
            onClick={props.onCopyCall}
            aria-live="polite"
          >
            {props.copied ? t("copied") : t("copyCall")}
          </button>
          <button
            type="button"
            className="plant-log-quiet"
            onClick={props.onNewCall}
          >
            {t("newCall")}
          </button>
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
        <OptionRow
          name="plant-duration"
          legend={t("since")}
          values={PLANT_DURATIONS}
          value={plant.duration}
          labelFor={(value) => t(`durations.${value}`)}
          onChange={(duration: PlantDuration) =>
            props.onChange({ ...plant, duration })
          }
        />
        <ObservationRow
          plant={plant}
          onChange={props.onChange}
          legend={t("asks")}
          labelFor={(value) => t(`observations.${value}`)}
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
