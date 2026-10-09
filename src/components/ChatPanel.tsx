"use client";

import { PlantLog } from "@/components/PlantLog";
import {
  describePlantCall,
  EMPTY_PLANT_CALL,
  formatPlantReadings,
  hasPlantReadings,
  OBSERVATIONS_BY_FAULT,
  PLANT_DUTIES,
  PLANT_FAULTS,
  PLANT_GASES,
  PLANT_OBSERVATIONS,
  plantCallHasLookup,
  sanitizePlantCall,
  toggleObservation,
  type PlantCall,
  type PlantCallLabels,
  type PlantObservation,
} from "@/lib/chat/plant-log";
import type { Citation } from "@/lib/rag/types";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type UiMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  hazard?: boolean;
  emergency?: boolean;
};

const PAGE_LABELS: Record<string, string> = {
  tr: "s.",
  ar: "ص.",
  ru: "стр.",
  de: "S.",
  pl: "s.",
};

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 14-7-4.5 14-3-5.5L5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M12 3.5 21.5 20h-19L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6 3h9l4 4v14H6V3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight, 160);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
}

function CitationList(props: {
  citations: Citation[];
  locale: string;
  sourcesLabel: string;
  openLabel: string;
  closeLabel: string;
  excerptLabel: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-3 border-t border-cantek-border pt-2.5">
      <p className="mb-2 text-[0.8rem] font-semibold text-cantek-muted">
        {props.sourcesLabel}
      </p>
      <div className="grid gap-1.5">
        {props.citations.map((citation) => {
          const open = openId === citation.chunkId;
          return (
            <div key={citation.chunkId} className="citation-block">
              <button
                type="button"
                className="citation-chip"
                title={citation.documentTitle}
                aria-expanded={open}
                onClick={() =>
                  setOpenId(open ? null : citation.chunkId)
                }
              >
                <DocumentIcon />
                <span className="truncate">
                  {citation.documentTitle}
                  {citation.page
                    ? ` ${PAGE_LABELS[props.locale] ?? "p."}${citation.page}`
                    : ""}
                </span>
                <span className="citation-toggle">
                  {open ? props.closeLabel : props.openLabel}
                </span>
              </button>
              {open && citation.excerpt && (
                <blockquote className="citation-excerpt">
                  <p className="citation-excerpt-label">{props.excerptLabel}</p>
                  <p>{citation.excerpt}</p>
                </blockquote>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function usePlantLabels(): PlantCallLabels {
  const t = useTranslations("plant");
  return {
    duty: Object.fromEntries(
      PLANT_DUTIES.map((duty) => [duty, t(`duties.${duty}`)]),
    ) as PlantCallLabels["duty"],
    fault: Object.fromEntries(
      PLANT_FAULTS.map((fault) => [fault, t(`faults.${fault}`)]),
    ) as PlantCallLabels["fault"],
    gas: Object.fromEntries(
      PLANT_GASES.map((gas) => [gas, t(`gases.${gas}`)]),
    ) as PlantCallLabels["gas"],
    observation: Object.fromEntries(
      PLANT_OBSERVATIONS.map((observation) => [
        observation,
        t(`observations.${observation}`),
      ]),
    ) as PlantCallLabels["observation"],
    serial: (value) => `${t("serial")} ${value}`,
  };
}

export function ChatPanel(props: {
  mode: "public" | "technician";
  serial?: string;
  onTranscriptChange?: (
    messages: { role: "user" | "assistant"; content: string }[],
  ) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const labels = usePlantLabels();
  const { onTranscriptChange } = props;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [plant, setPlant] = useState<PlantCall>(EMPTY_PLANT_CALL);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPlant = useMemo(
    () => ({
      ...plant,
      serial: plant.serial.trim() || props.serial?.trim() || plant.serial,
      readings: plant.readings ?? {
        roomC: "",
        setC: "",
        displayCode: "",
      },
    }),
    [plant, props.serial],
  );
  const activePlant = useMemo(
    () => sanitizePlantCall(editorPlant),
    [editorPlant],
  );
  const remainingObservations = useMemo(() => {
    const options = activePlant.fault
      ? OBSERVATIONS_BY_FAULT[activePlant.fault]
      : [];
    return options.filter(
      (observation) => !activePlant.observations.includes(observation),
    );
  }, [activePlant]);

  useEffect(() => {
    onTranscriptChange?.(
      messages.map(({ role, content }) => ({ role, content })),
    );
  }, [messages, onTranscriptChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send(nextContent?: string, nextPlant?: PlantCall) {
    const call = sanitizePlantCall({
      ...(nextPlant ?? activePlant),
      serial:
        (nextPlant ?? activePlant).serial.trim() ||
        props.serial?.trim() ||
        "",
    });
    const typed = (nextContent ?? input).trim();
    const card = describePlantCall(call, labels);
    const content =
      messages.length === 0 && card && typed && typed !== card
        ? `${card}\n\n${typed}`
        : typed || card;
    if (!content || busy) return;
    if (!typed && !plantCallHasLookup(call)) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content: line }) => ({
            role,
            content: line,
          })),
          mode: props.mode,
          serial: call.serial,
          plant: call,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === "rate_limited" || res.status === 429
            ? "rate_limited"
            : (data.error ?? "chat_failed"),
        );
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer ?? t("chat.noDocs"),
          citations: data.citations,
          hazard: data.hazard,
          emergency: data.emergency,
        },
      ]);
    } catch (error) {
      const limited =
        error instanceof Error && error.message === "rate_limited";
      setMessages([
        ...next,
        {
          role: "assistant",
          content: limited ? t("chat.rateLimited") : t("chat.error"),
        },
      ]);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function sendObservation(observation: PlantObservation) {
    const nextPlant = toggleObservation(activePlant, observation);
    setPlant(nextPlant);
    void send(t(`plant.observations.${observation}`), nextPlant);
  }

  function resetCall() {
    setMessages([]);
    setPlant(EMPTY_PLANT_CALL);
    setInput("");
  }

  const compactLog = messages.length > 0;
  const plantSummary = describePlantCall(activePlant, labels);
  const readingStamp = formatPlantReadings(activePlant);

  return (
    <div className="chat-shell">
      <div className="chat-shell-header flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="chat-badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 7.5h14v9H9l-4 3v-12Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 11h7M8.5 13.5h4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[0.8rem] font-semibold text-cantek-cyan">
              Cantek Group
            </p>
            <h3 className="mt-1 truncate text-lg font-bold text-cantek-dark">
              {t("home.workspaceTitle")}
            </h3>
          </div>
        </div>
        <span className="hidden border border-cantek-border bg-cantek-light px-3 py-1.5 text-[0.78rem] font-semibold text-cantek-muted sm:inline">
          {props.mode === "technician" ? t("nav.technician") : t("nav.diagnostics")}
        </span>
      </div>
      <PlantLog
        plant={editorPlant}
        serialLocked={Boolean(props.serial?.trim()) && props.mode === "technician"}
        compact={compactLog}
        busy={busy}
        onChange={setPlant}
        onLookup={() => void send()}
        onNewCall={resetCall}
      />
      <div
        className="chat-scroll space-y-4 p-4 sm:p-6"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <p className="px-1 text-sm leading-6 text-cantek-muted">
            {activePlant.fault
              ? readingStamp
                ? t("plant.asksHint")
                : t("plant.readingsHint")
              : t("home.empty")}
          </p>
        )}
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          const isLastAssistant =
            !isUser &&
            index === messages.length - 1 &&
            !busy &&
            remainingObservations.length > 0;

          if (isUser) {
            return (
              <div key={index} className="message-row flex-row-reverse">
                <div
                  className="message-avatar message-avatar-user"
                  aria-hidden="true"
                >
                  {t("chat.you").slice(0, 1).toUpperCase()}
                </div>
                <article className="message-bubble message-bubble-user">
                  <p className="mb-1.5 text-[0.78rem] font-semibold text-cantek-muted">
                    {t("chat.you")}
                  </p>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </article>
              </div>
            );
          }

          return (
            <article key={index} className="service-bulletin">
              <header className="service-bulletin-head">
                <div className="min-w-0">
                  <p className="service-bulletin-ref">{t("plant.bulletin")}</p>
                  <p className="service-bulletin-title">
                    {plantSummary || t("home.workspaceTitle")}
                  </p>
                </div>
                <p className="service-bulletin-site">Antalya</p>
              </header>
              {hasPlantReadings(activePlant) && (
                <dl className="service-bulletin-readings">
                  {activePlant.readings?.roomC ? (
                    <div className="service-bulletin-reading">
                      <dt>{t("plant.room")}</dt>
                      <dd>
                        {activePlant.readings.roomC}
                        <span>{t("plant.roomUnit")}</span>
                      </dd>
                    </div>
                  ) : null}
                  {activePlant.readings?.setC ? (
                    <div className="service-bulletin-reading">
                      <dt>{t("plant.set")}</dt>
                      <dd>
                        {activePlant.readings.setC}
                        <span>{t("plant.roomUnit")}</span>
                      </dd>
                    </div>
                  ) : null}
                  {activePlant.readings?.displayCode ? (
                    <div className="service-bulletin-reading">
                      <dt>{t("plant.code")}</dt>
                      <dd>{activePlant.readings.displayCode}</dd>
                    </div>
                  ) : null}
                </dl>
              )}
              <div className="service-bulletin-body">
                {message.emergency && (
                  <div className="alert-card alert-card-danger mb-3">
                    <WarningIcon />
                    <span>{t("danger.emergency")}</span>
                  </div>
                )}
                {message.hazard && (
                  <div className="alert-card alert-card-warning mb-3">
                    <WarningIcon />
                    <span>
                      {t("danger.title")}: {t("danger.body")}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.citations && message.citations.length > 0 && (
                  <CitationList
                    citations={message.citations}
                    locale={locale}
                    sourcesLabel={t("home.sources")}
                    openLabel={t("plant.openExcerpt")}
                    closeLabel={t("plant.closeExcerpt")}
                    excerptLabel={t("plant.excerpt")}
                  />
                )}
              </div>
              {isLastAssistant && (
                <div className="service-bulletin-asks">
                  <p className="plant-log-legend">{t("plant.asks")}</p>
                  <div className="plant-log-options">
                    {remainingObservations.map((observation) => (
                      <button
                        key={observation}
                        type="button"
                        className="plant-log-option"
                        onClick={() => sendObservation(observation)}
                      >
                        {t(`plant.observations.${observation}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {busy && (
          <div className="message-row">
            <div
              className="message-avatar message-avatar-assistant"
              aria-hidden="true"
            >
              C
            </div>
            <div className="message-bubble message-bubble-assistant flex items-center gap-2 py-3">
              <span className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="text-xs font-bold text-cantek-muted">
                {t("home.thinking")}
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>
      <form
        className="chat-composer flex items-end gap-3 p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          className="max-h-40 min-h-11 flex-1 resize-none overflow-hidden px-3 py-2.5 text-sm text-cantek-text"
          placeholder={t("home.placeholder")}
          value={input}
          maxLength={4_000}
          aria-label={t("home.placeholder")}
          onChange={(e) => {
            setInput(e.target.value);
            resizeComposer(e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="submit"
          disabled={busy || (!input.trim() && !plantCallHasLookup(activePlant))}
          className="send-button"
          aria-label={t("home.send")}
        >
          <span className="hidden sm:inline">{t("home.send")}</span>
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
