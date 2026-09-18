"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type StationId =
  | "condenser"
  | "compressor"
  | "evaporator"
  | "room"
  | "controller";

type FaultId =
  | "roomNotPulling"
  | "roomWarm"
  | "evapIce"
  | "evapFan"
  | "compNoStart"
  | "compShortCycle"
  | "condHp"
  | "condFan"
  | "ctrlHp"
  | "ctrlLp"
  | "ctrlDef";

const STATION_FAULTS: Record<StationId, FaultId[]> = {
  condenser: ["condHp", "condFan"],
  compressor: ["compNoStart", "compShortCycle"],
  evaporator: ["evapIce", "evapFan"],
  room: ["roomNotPulling", "roomWarm"],
  controller: ["ctrlHp", "ctrlLp", "ctrlDef"],
};

const RETRIEVAL_TOKENS: Partial<Record<FaultId, string>> = {
  condHp: "HP high pressure condenser",
  ctrlHp: "HP alarm Octosense",
  ctrlLp: "LP alarm Octosense",
  ctrlDef: "DEF defrost Octosense",
};

function stationClass(id: StationId, selected: StationId | null): string {
  return `plant-item plant-item-${id}${selected === id ? " is-selected" : ""}`;
}

export function PlantCircuit(props: {
  disabled?: boolean;
  onLookup: (query: string) => void;
}) {
  const t = useTranslations("home.circuit");
  const [station, setStation] = useState<StationId | null>(null);
  const [fault, setFault] = useState<FaultId | null>(null);

  const faults = station ? STATION_FAULTS[station] : [];

  const query = useMemo(() => {
    if (!station || !fault) return "";
    const parts = [
      t(`stations.${station}`),
      t(`faults.${fault}`),
      RETRIEVAL_TOKENS[fault],
    ].filter(Boolean);
    return parts.join(": ");
  }, [fault, station, t]);

  return (
    <div className="plant-circuit">
      <div className="plant-circuit-copy">
        <h4 className="plant-circuit-title">{t("title")}</h4>
        <p className="plant-circuit-help">{t("help")}</p>
      </div>

      <div className="plant-section" role="group" aria-label={t("title")}>
        <div className="plant-roof">
          <button
            type="button"
            className={stationClass("condenser", station)}
            aria-pressed={station === "condenser"}
            disabled={props.disabled}
            onClick={() => {
              setStation("condenser");
              setFault(null);
            }}
          >
            <span className="plant-item-name">{t("stations.condenser")}</span>
            <span className="plant-item-place">{t("places.outdoor")}</span>
          </button>
          <span className="plant-pipe plant-pipe-hot" aria-hidden="true">
            {t("pipeDischarge")}
          </span>
          <button
            type="button"
            className={stationClass("compressor", station)}
            aria-pressed={station === "compressor"}
            disabled={props.disabled}
            onClick={() => {
              setStation("compressor");
              setFault(null);
            }}
          >
            <span className="plant-item-name">{t("stations.compressor")}</span>
            <span className="plant-item-place">{t("places.pack")}</span>
          </button>
        </div>

        <div className="plant-risers" aria-hidden="true">
          <span className="plant-pipe plant-pipe-liquid">{t("pipeLiquid")}</span>
          <span className="plant-pipe plant-pipe-cold">{t("pipeSuction")}</span>
        </div>

        <div className="plant-room">
          <button
            type="button"
            className={stationClass("evaporator", station)}
            aria-pressed={station === "evaporator"}
            disabled={props.disabled}
            onClick={() => {
              setStation("evaporator");
              setFault(null);
            }}
          >
            <span className="plant-item-name">{t("stations.evaporator")}</span>
            <span className="plant-item-place">{t("places.coil")}</span>
          </button>
          <button
            type="button"
            className={stationClass("room", station)}
            aria-pressed={station === "room"}
            disabled={props.disabled}
            onClick={() => {
              setStation("room");
              setFault(null);
            }}
          >
            <span className="plant-item-name">{t("stations.room")}</span>
            <span className="plant-item-place">{t("places.product")}</span>
          </button>
        </div>

        <button
          type="button"
          className={stationClass("controller", station)}
          aria-pressed={station === "controller"}
          disabled={props.disabled}
          onClick={() => {
            setStation("controller");
            setFault(null);
          }}
        >
          <span className="plant-item-name">{t("stations.controller")}</span>
          <span className="plant-item-place">{t("places.panel")}</span>
        </button>
      </div>

      {station && (
        <div className="plant-faults" role="group" aria-label={t("symptom")}>
          <p className="plant-faults-label">{t("symptom")}</p>
          <div className="plant-faults-row">
            {faults.map((id) => (
              <button
                key={id}
                type="button"
                className={`plant-fault${fault === id ? " is-selected" : ""}`}
                aria-pressed={fault === id}
                disabled={props.disabled}
                onClick={() => setFault(id)}
              >
                {t(`faults.${id}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="plant-circuit-actions">
        <button
          type="button"
          className="send-button"
          disabled={props.disabled || !query}
          onClick={() => props.onLookup(query)}
        >
          {t("lookUp")}
        </button>
        {station && fault && (
          <p className="plant-circuit-picked">
            {t("picked", {
              station: t(`stations.${station}`),
              fault: t(`faults.${fault}`),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
