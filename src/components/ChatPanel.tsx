"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);

  useEffect(() => {
    props.onTranscriptChange?.(
      messages.map(({ role, content }) => ({ role, content })),
    );
  }, [messages, props.onTranscriptChange]);

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
        { role: "assistant", content: t("chat.noDocs") },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-col rounded-md border border-navy/10 bg-white shadow-sm">
      <div
        className="flex-1 space-y-4 overflow-y-auto p-5"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <p className="text-sm leading-6 text-navy/70">{t("home.empty")}</p>
        )}
        {messages.map((m, i) => (
          <article
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-md bg-paper px-4 py-3 text-sm"
                : "mr-4 rounded-md border border-navy/10 px-4 py-3 text-sm leading-6"
            }
          >
            <p className="mb-1 text-[11px] uppercase tracking-wider text-ice-dim">
              {m.role === "user" ? t("chat.you") : t("chat.assistant")}
            </p>
            {m.emergency && (
              <p className="mb-2 rounded-sm bg-danger px-3 py-2 text-xs font-semibold text-white">
                {t("danger.emergency")}
              </p>
            )}
            {m.hazard && (
              <p className="mb-2 rounded-sm bg-warn px-3 py-2 text-xs font-semibold text-white">
                {t("danger.title")}: {t("danger.body")}
              </p>
            )}
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.citations && m.citations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-navy/10 pt-2 text-xs text-navy/60">
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
        {busy && <p className="text-sm text-ice-dim">{t("home.thinking")}</p>}
      </div>
      <form
        className="flex gap-2 border-t border-navy/10 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="h-20 flex-1 resize-none rounded-sm border border-navy/15 px-3 py-2 text-sm outline-none focus:border-ice"
          placeholder={t("home.placeholder")}
          value={input}
          maxLength={4_000}
          aria-label={t("home.placeholder")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-sm bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-50"
        >
          {t("home.send")}
        </button>
      </form>
    </div>
  );
}
