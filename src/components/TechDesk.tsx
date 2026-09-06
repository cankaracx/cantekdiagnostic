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

  async function handoff() {
    setStatus("…");
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
    setStatus(data.id ? `${t("handoffDone")}: ${data.id}` : data.error);
  }

  async function signOut() {
    await fetch("/api/staff-login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-md border border-navy/10 bg-white p-5 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {t("serial")}
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="rounded-sm border border-navy/15 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("notes")}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-sm border border-navy/15 px-3 py-2"
          />
        </label>
        <div className="flex gap-3 md:col-span-2">
          <button
            type="button"
            onClick={() => void handoff()}
            className="rounded-sm bg-navy px-4 py-2 text-sm text-white"
          >
            {t("handoff")}
          </button>
          <button type="button" onClick={() => void signOut()} className="text-sm underline">
            {t("signOut")}
          </button>
          {status && <span className="text-sm text-navy/60">{status}</span>}
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
