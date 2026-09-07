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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);

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
    const previous = messages;
    const next = [...messages, { role: "user" as const, content: text }];
    const controller = new AbortController();
    requestRef.current = controller;
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
        signal: controller.signal,
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
      if (controller.signal.aborted) {
        setMessages(previous);
        setInput(text);
        return;
      }
      setMessages([
        ...next,
        { role: "assistant", content: t("chat.error") },
      ]);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function clearConversation() {
    requestRef.current?.abort();
    setMessages([]);
    setInput("");
    setCopiedIndex(null);
    textareaRef.current?.focus();
  }

  function downloadTranscript() {
    const transcript = messages
      .map((message) => {
        const speaker =
          message.role === "user" ? t("chat.you") : t("chat.assistant");
        const sources = message.citations?.length
          ? `\n${t("home.sources")}: ${message.citations
              .map(
                (citation) =>
                  `${citation.documentTitle}${
                    citation.page ? ` (p.${citation.page})` : ""
                  }`,
              )
              .join(", ")}`
          : "";
        return `${speaker}\n${message.content}${sources}`;
      })
      .join("\n\n---\n\n");
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cantek-diagnostic-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyAnswer(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      window.setTimeout(
        () => setCopiedIndex((current) => (current === index ? null : current)),
        1_800,
      );
    } catch {
      setCopiedIndex(null);
    }
  }

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
            <div className="flex items-center gap-2">
              <span className="cantek-pulse-dot" aria-hidden="true" />
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-cantek-cyan">
                Cantek Group
              </p>
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-cantek-dark">
              {t("home.workspaceTitle")}
            </h3>
          </div>
        </div>
        <div className="chat-header-actions">
          <span className="hidden border border-cantek-border bg-cantek-light px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-cantek-muted lg:inline">
            {props.mode === "technician"
              ? t("nav.technician")
              : t("nav.diagnostics")}
          </span>
          <button
            type="button"
            className="chat-utility-button"
            disabled={messages.length === 0}
            onClick={downloadTranscript}
          >
            {t("chat.download")}
          </button>
          <button
            type="button"
            className="chat-utility-button"
            disabled={messages.length === 0 && !input}
            onClick={clearConversation}
          >
            {t("chat.newChat")}
          </button>
        </div>
      </div>
      <div
        className="chat-scroll space-y-4 p-4 sm:p-6"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <div className="border border-cantek-border border-s-4 border-s-cantek-cyan bg-white px-5 py-4 shadow-[0_3px_12px_rgb(39_50_58_/_5%)]">
            <p className="text-sm leading-6 text-cantek-muted">{t("home.empty")}</p>
          </div>
        )}
        {messages.map((message, index) => {
          const isUser = message.role === "user";

          return (
            <div
              key={index}
              className={`message-row ${isUser ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`message-avatar ${
                  isUser ? "message-avatar-user" : "message-avatar-assistant"
                }`}
                aria-hidden="true"
              >
                {isUser ? t("chat.you").slice(0, 1).toUpperCase() : "AI"}
              </div>
              <article
                className={`message-bubble ${
                  isUser ? "message-bubble-user" : "message-bubble-assistant"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-4">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-cantek-muted">
                    {isUser ? t("chat.you") : t("chat.assistant")}
                  </p>
                  {!isUser && (
                    <button
                      type="button"
                      className="copy-answer-button"
                      onClick={() => void copyAnswer(message.content, index)}
                    >
                      {copiedIndex === index
                        ? t("chat.copied")
                        : t("chat.copy")}
                    </button>
                  )}
                </div>
                {message.emergency && (
                  <div className="alert-card alert-card-danger mb-2">
                    <WarningIcon />
                    <span>{t("danger.emergency")}</span>
                  </div>
                )}
                {message.hazard && (
                  <div className="alert-card alert-card-warning mb-2">
                    <WarningIcon />
                    <span>
                      {t("danger.title")}: {t("danger.body")}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 border-t border-cantek-border pt-2.5">
                    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-cantek-muted">
                      {t("home.sources")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.map((citation) => (
                        <span
                          key={citation.chunkId}
                          className="citation-chip"
                          title={citation.documentTitle}
                        >
                          <DocumentIcon />
                          <span className="truncate">
                            {citation.documentTitle}
                            {citation.page ? ` · p.${citation.page}` : ""}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </div>
          );
        })}
        {busy && (
          <div className="message-row">
            <div
              className="message-avatar message-avatar-assistant"
              aria-hidden="true"
            >
              AI
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
        className="chat-composer flex items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            rows={3}
            className="min-h-20 w-full resize-none px-3 py-2.5 text-sm text-cantek-text"
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
          <div className="composer-meta">
            <span>{t("chat.inputHint")}</span>
            <span>{input.length.toLocaleString(locale)} / 4,000</span>
          </div>
        </div>
        {busy ? (
          <button
            type="button"
            className="send-button stop-button"
            onClick={() => requestRef.current?.abort()}
          >
            {t("chat.stop")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="send-button"
            aria-label={t("home.send")}
          >
            <span className="hidden sm:inline">{t("home.send")}</span>
            <SendIcon />
          </button>
        )}
      </form>
    </div>
  );
}
