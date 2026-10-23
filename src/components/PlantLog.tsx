"use client";

import { useTranslations } from "next-intl";
import {
  OBSERVATIONS_BY_FAULT,
  PLANT_CONTROLLERS,
  PLANT_DUTIES,
  PLANT_FAULTS,
  PLANT_GASES,
  plantCallHasLookup,
  toggleObservation,
  type PlantCall,
  type PlantController,
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

const CONTROLLER_MARK: Record<
  Exclude<PlantController, "unknown">,
  { mark: string; lineKey: "octosense" | "irs" | "octopush" }
> = {
  octosense: { mark: "OCTOSENSE", lineKey: "octosense" },
  irs: { mark: "IRS", lineKey: "irs" },
  octopush: { mark: "OCTOPUSH", lineKey: "octopush" },
};

function ControllerBay(props: {
  value: PlantController;
  onChange: (value: PlantController) => void;
  legend: string;
  hint: string;
  unknownLabel: string;
  lineFor: (value: Exclude<PlantController, "unknown">) => string;
}) {
  return (
    <fieldset className="controller-fieldset">
      <legend className="plant-log-legend">{props.legend}</legend>
      <p className="controller-hint">{props.hint}</p>
      <div className="controller-bay">
        {PLANT_CONTROLLERS.filter(
          (controller): controller is Exclude<PlantController, "unknown"> =>
            controller !== "unknown",
        ).map((controller) => {
          const selected = props.value === controller;
          const plate = CONTROLLER_MARK[controller];
          return (
            <label
              key={controller}
              className={`controller-plate ${selected ? "controller-plate-on" : ""}`}
            >
              <input
                type="radio"
                name="plant-controller"
                value={controller}
                checked={selected}
                onChange={() => props.onChange(controller)}
              />
              <span className="controller-led" aria-hidden="true" />
              <span className="controller-mark">{plate.mark}</span>
              <span className="controller-line">{props.lineFor(controller)}</span>
            </label>
          );
        })}
      </div>
      <label
        className={`controller-unknown ${props.value === "unknown" ? "controller-unknown-on" : ""}`}
      >
        <input
          type="radio"
          name="plant-controller"
          value="unknown"
          checked={props.value === "unknown"}
          onChange={() => props.onChange("unknown")}
        />
        <span>{props.unknownLabel}</span>
      </label>
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

  if (props.compact) {
    const summary = [
      plant.duty ? t(`duties.${plant.duty}`) : null,
      plant.fault ? t(`faults.${plant.fault}`) : null,
      plant.controller !== "unknown"
        ? t(`controllers.${plant.controller}`)
        : null,
      plant.refrigerant !== "unknown" ? t(`gases.${plant.refrigerant}`) : null,
      ...plant.observations.map((observation) =>
        t(`observations.${observation}`),
      ),
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
          onChange={(fault: PlantFault) =>
            props.onChange({ ...plant, fault, observations: [] })
          }
        />
        <ControllerBay
          value={plant.controller}
          legend={plant.fault === "alarm" ? t("controllerAlarm") : t("controller")}
          hint={t("controllerHint")}
          unknownLabel={t("controllers.unknown")}
          lineFor={(value) => t(`controllerLines.${value}`)}
          onChange={(controller: PlantController) =>
            props.onChange({ ...plant, controller })
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
