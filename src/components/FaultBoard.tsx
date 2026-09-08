"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  composeFaultQuery,
  FAULT_LAMPS,
  normalizeAlarmCode,
  type FaultLamp,
} from "@/lib/rag/alarms";

function LampIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`fault-lamp-led ${active ? "fault-lamp-led-on" : ""}`}
      aria-hidden="true"
    />
  );
}

export function FaultBoard({
  disabled,
  onLookup,
}: {
  disabled: boolean;
  onLookup: (query: string) => void;
}) {
  const t = useTranslations("home.faults");
  const [lamps, setLamps] = useState<FaultLamp[]>([]);
  const [code, setCode] = useState("");

  const query = useMemo(
    () =>
      composeFaultQuery(lamps, code, {
        hp: t("hpQuery"),
        lp: t("lpQuery"),
        hi: t("hiQuery"),
        defrost: t("defrostQuery"),
        code: t("codeQuery", { code: normalizeAlarmCode(code) || "CODE" }),
      }),
    [code, lamps, t],
  );

  function toggle(lamp: FaultLamp) {
    setLamps((current) =>
      current.includes(lamp)
        ? current.filter((item) => item !== lamp)
        : [...current, lamp],
    );
  }

  return (
    <form
      className="fault-fascia"
      onSubmit={(event) => {
        event.preventDefault();
        if (!query || disabled) return;
        onLookup(query);
      }}
    >
      <div className="fault-fascia-readout">
        <p className="fault-fascia-plant">{t("plant")}</p>
        <p className="fault-fascia-code" aria-live="polite">
          {normalizeAlarmCode(code) || (lamps[0] ? lamps[0].toUpperCase() : "— — —")}
        </p>
        <p className="fault-fascia-status">
          {lamps.length || code.trim() ? t("alarmOn") : t("standby")}
        </p>
      </div>

      <div className="fault-fascia-body">
        <p className="fault-fascia-help">{t("help")}</p>
        <div className="fault-lamp-row" role="group" aria-label={t("lamps")}>
          {FAULT_LAMPS.map((lamp) => {
            const active = lamps.includes(lamp);
            return (
              <button
                key={lamp}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggle(lamp)}
                className={`fault-lamp ${active ? "fault-lamp-active" : ""}`}
              >
                <LampIcon active={active} />
                <span className="fault-lamp-code">{t(`${lamp}Code`)}</span>
                <span className="fault-lamp-name">{t(lamp)}</span>
              </button>
            );
          })}
        </div>

        <div className="fault-code-row">
          <label className="fault-code-field">
            <span>{t("code")}</span>
            <input
              value={code}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              placeholder={t("codePlaceholder")}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={disabled || !query}
            className="fault-lookup"
          >
            {t("lookup")}
          </button>
        </div>
      </div>
    </form>
  );
}
