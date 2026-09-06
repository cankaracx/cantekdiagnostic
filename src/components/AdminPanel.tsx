"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type DocRow = {
  id: string;
  title: string;
  visibility: string;
  language: string;
  equipment?: string;
};

export function AdminPanel() {
  const t = useTranslations("admin");
  const tech = useTranslations("tech");
  const [status, setStatus] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Unable to load documents");
      return;
    }
    setDocs(data.documents ?? []);
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = new FormData(form);
    setStatus("…");
    const res = await fetch("/api/ingest", { method: "POST", body });
    const data = await res.json();
    setStatus(data.error ?? data.title ?? "ok");
    if (res.ok) {
      form.reset();
      await refresh();
    }
  }

  async function signOut() {
    await fetch("/api/staff-login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onUpload} className="grid gap-4 rounded-md border border-navy/10 bg-white p-5">
        <label className="grid gap-1 text-sm">
          {t("file")}
          <input
            name="file"
            type="file"
            accept=".pdf,.docx,.md,.txt"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("titleLabel")}
          <input name="title" className="rounded-sm border border-navy/15 px-3 py-2" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            {t("visibility")}
            <select name="visibility" className="rounded-sm border border-navy/15 px-3 py-2" defaultValue="repair">
              <option value="repair">{t("repair")}</option>
              <option value="internal">{t("internal")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("language")}
            <input name="language" defaultValue="en" className="rounded-sm border border-navy/15 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            {t("equipment")}
            <input name="equipment" className="rounded-sm border border-navy/15 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            {t("refrigerant")}
            <input name="refrigerant" className="rounded-sm border border-navy/15 px-3 py-2" />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          {t("version")}
          <input name="version" className="rounded-sm border border-navy/15 px-3 py-2" />
        </label>
        <button className="justify-self-start rounded-sm bg-navy px-4 py-2 text-sm text-white">
          {t("upload")}
        </button>
      </form>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm text-ice-dim underline"
        >
          {t("indexed")}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-navy/70 underline"
        >
          {tech("signOut")}
        </button>
        {status && <span className="text-sm text-navy/60">{status}</span>}
      </div>
      <ul className="divide-y divide-navy/10 rounded-md border border-navy/10 bg-white">
        {docs.map((d) => (
          <li key={d.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{d.title}</span>
            <span className="text-navy/50">
              {d.visibility} · {d.language}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
