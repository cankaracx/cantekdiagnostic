"use client";

import {
  PLANT_EQUIPMENT_IDS,
  PLANT_FAULT_IDS,
  type PlantEquipmentId,
  type PlantFaultId,
} from "@/lib/chat/plant";
import { useTranslations } from "next-intl";

type JobDocketProps = {
  equipment?: PlantEquipmentId;
  fault?: PlantFaultId;
  serial: string;
  onEquipmentChange: (value: PlantEquipmentId | undefined) => void;
  onFaultChange: (value: PlantFaultId | undefined) => void;
  onSerialChange: (value: string) => void;
  onSearchJob: () => void;
  canSearchJob: boolean;
};

export function JobDocket(props: JobDocketProps) {
  const t = useTranslations("plant");
  const stamped =
    props.equipment && props.fault
      ? t("selected", {
          equipment: t(`equipmentOptions.${props.equipment}`),
          fault: t(`faultOptions.${props.fault}`),
        })
      : null;

  return (
    <section className="job-docket" aria-label={t("docketLabel")}>
      <header className="job-docket-head">
        <div>
          <p className="text-[0.72rem] font-semibold text-white/55">
            Cantek Service
          </p>
          <h3 className="mt-1 text-base font-bold text-white">
            {t("docketTitle")}
          </h3>
        </div>
        {stamped ? (
          <p className="job-stamp" aria-live="polite">
            {stamped}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 px-4 py-4 sm:px-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-cantek-dark">
            {t("equipment")}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {PLANT_EQUIPMENT_IDS.map((id) => {
              const pressed = props.equipment === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={pressed}
                  className="job-option"
                  onClick={() =>
                    props.onEquipmentChange(pressed ? undefined : id)
                  }
                >
                  {t(`equipmentOptions.${id}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-cantek-dark">
            {t("fault")}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {PLANT_FAULT_IDS.map((id) => {
              const pressed = props.fault === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={pressed}
                  className="job-option"
                  onClick={() => props.onFaultChange(pressed ? undefined : id)}
                >
                  {t(`faultOptions.${id}`)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold text-cantek-dark">
            {t("serial")}
            <input
              value={props.serial}
              maxLength={80}
              placeholder={t("serialPlaceholder")}
              autoComplete="off"
              className="job-serial"
              onChange={(event) => props.onSerialChange(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="cantek-button shrink-0"
            disabled={!props.canSearchJob}
            onClick={() => props.onSearchJob()}
          >
            {t("askFromJob")}
          </button>
        </div>
      </div>
    </section>
  );
}
