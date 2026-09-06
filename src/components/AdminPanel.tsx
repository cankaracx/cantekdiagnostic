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
    await fetch("/api/admin-login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onUpload} className="cantek-form grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          {t("file")}
          <input
            name="file"
            type="file"
            accept=".pdf,.docx,.md,.txt"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          {t("titleLabel")}
          <input name="title" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            {t("visibility")}
            <select name="visibility" defaultValue="repair">
              <option value="repair">{t("repair")}</option>
              <option value="internal">{t("internal")}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t("language")}
            <input name="language" defaultValue="en" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t("equipment")}
            <input name="equipment" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t("refrigerant")}
            <input name="refrigerant" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          {t("version")}
          <input name="version" />
        </label>
        <button className="cantek-button justify-self-start">
          {t("upload")}
        </button>
      </form>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm font-semibold text-cantek-muted underline hover:text-cantek-cyan"
        >
          {t("indexed")}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm font-semibold text-cantek-muted underline hover:text-cantek-cyan"
        >
          {tech("signOut")}
        </button>
        {status && <span className="text-sm text-cantek-muted">{status}</span>}
      </div>
      <ul className="divide-y divide-cantek-border border border-cantek-border bg-white">
        {docs.map((d) => (
          <li key={d.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{d.title}</span>
            <span className="text-cantek-muted">
              {d.visibility} · {d.language}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
