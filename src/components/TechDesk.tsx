"use client";

import { ChatPanel } from "@/components/ChatPanel";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Line = { role: "user" | "assistant"; content: string };

export function TechDesk() {
  const t = useTranslations("tech");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handoff() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelSerial: serial,
          notes,
          transcript,
        }),
      });
      const data = await res.json();
      setStatus(res.ok && data.id ? `${t("handoffDone")}: ${data.id}` : t("error"));
    } catch {
      setStatus(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/staff-login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="cantek-form grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          {t("serial")}
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          {t("notes")}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="flex gap-3 md:col-span-2">
          <button
            type="button"
            onClick={() => void handoff()}
            disabled={busy}
            className="cantek-button"
          >
            {busy ? t("working") : t("handoff")}
          </button>
          <button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-cantek-muted underline hover:text-cantek-cyan">
            {t("signOut")}
          </button>
          {status && <span className="text-sm text-cantek-muted">{status}</span>}
        </div>
      </div>
      <ChatPanel
        mode="technician"
        serial={serial}
        onTranscriptChange={setTranscript}
      />
    </div>
  );
}
