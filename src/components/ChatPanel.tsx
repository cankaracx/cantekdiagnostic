"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Citation } from "@/lib/rag/types";

type UiMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  hazard?: boolean;
  emergency?: boolean;
};

export function ChatPanel(props: {
  mode: "public" | "technician";
  serial?: string;
  onTranscriptChange?: (
    messages: { role: "user" | "assistant"; content: string }[],
  ) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { onTranscriptChange } = props;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onTranscriptChange?.(
      messages.map(({ role, content }) => ({ role, content })),
    );
  }, [messages, onTranscriptChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          mode: props.mode,
          serial: props.serial,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "chat_failed");
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
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: t("chat.error") },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[34rem] flex-col border border-cantek-border bg-white shadow-[0_10px_28px_rgb(50_62_72_/_8%)]">
      <div className="flex items-center justify-between border-b-4 border-cantek-cyan bg-cantek-dark px-5 py-4 text-white">
        <div>
          <p className="cantek-kicker text-cantek-cyan">Cantek Group</p>
          <h3 className="mt-1 text-lg font-bold">{t("home.workspaceTitle")}</h3>
        </div>
        <span className="hidden border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/70 sm:inline">
          {props.mode === "technician" ? t("nav.technician") : t("nav.diagnostics")}
        </span>
      </div>
      <div
        className="flex-1 space-y-4 overflow-y-auto bg-cantek-light/50 p-4 sm:p-6"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <div className="border-s-4 border-cantek-cyan bg-white px-5 py-4">
            <p className="text-sm leading-6 text-cantek-muted">{t("home.empty")}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <article
            key={i}
            className={
              m.role === "user"
                ? "ms-5 border-s-4 border-cantek-dark bg-white px-4 py-3 text-sm sm:ms-12"
                : "me-2 border-s-4 border-cantek-cyan bg-white px-4 py-3 text-sm leading-6 sm:me-8"
            }
          >
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-cantek-muted">
              {m.role === "user" ? t("chat.you") : t("chat.assistant")}
            </p>
            {m.emergency && (
              <p className="mb-2 bg-danger px-3 py-2 text-xs font-semibold text-white">
                {t("danger.emergency")}
              </p>
            )}
            {m.hazard && (
              <p className="mb-2 bg-warn px-3 py-2 text-xs font-semibold text-white">
                {t("danger.title")}: {t("danger.body")}
              </p>
            )}
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.citations && m.citations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-cantek-border pt-2 text-xs text-cantek-muted">
                <li className="font-medium uppercase tracking-wider">
                  {t("home.sources")}
                </li>
                {m.citations.map((c) => (
                  <li key={c.chunkId}>
                    {c.documentTitle}
                    {c.page ? ` · p.${c.page}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {busy && <p className="text-sm font-semibold text-cantek-cyan">{t("home.thinking")}</p>}
        <div ref={endRef} aria-hidden="true" />
      </div>
      <form
        className="flex flex-col gap-3 border-t border-cantek-border bg-white p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="h-24 flex-1 resize-none border border-cantek-border px-3 py-2 text-sm outline-none focus:border-cantek-cyan focus:ring-1 focus:ring-cantek-cyan"
          placeholder={t("home.placeholder")}
          value={input}
          maxLength={4_000}
          aria-label={t("home.placeholder")}
          onChange={(e) => setInput(e.target.value)}
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
          disabled={busy}
          className="cantek-button w-full self-end sm:w-auto"
        >
          {t("home.send")}
        </button>
      </form>
    </div>
  );
}
