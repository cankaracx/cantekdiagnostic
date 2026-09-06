"use client";

import { localeLabels } from "@/lib/geo/locales";
import { locales } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type DocRow = {
  id: string;
  title: string;
  visibility: string;
  language: string;
  equipment?: string;
  version?: string;
  chunkCount?: number;
};

type Notice = { tone: "success" | "error"; message: string } | null;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".md", ".txt"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminPanel() {
  const t = useTranslations("admin");
  const tech = useTranslations("tech");
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiKey, setAiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [aiNotice, setAiNotice] = useState<Notice>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "documents_unavailable");
      setDocs(data.documents ?? []);
    } catch {
      setNotice({ tone: "error", message: t("errors.documentsUnavailable") });
    } finally {
      setLoadingDocs(false);
    }
  }, [t]);

  const refreshAiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin-settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "settings_unavailable");
      setAiConfigured(Boolean(data.configured));
      setAiHint(data.hint ?? null);
    } catch {
      setAiNotice({ tone: "error", message: t("ai.statusUnavailable") });
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([refresh(), refreshAiStatus()]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshAiStatus]);

  function validateFile(candidate: File): string | null {
    const extension = candidate.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
    if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
      return t("errors.unsupportedFile");
    }
    if (!candidate.size || candidate.size > MAX_FILE_SIZE) {
      return t("errors.fileTooLarge");
    }
    return null;
  }

  function chooseFile(candidate: File | null) {
    if (!candidate) return;
    const error = validateFile(candidate);
    if (error) {
      setFile(null);
      setNotice({ tone: "error", message: error });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(candidate);
    setNotice(null);
  }

  function uploadError(code?: string): string {
    if (code === "file_too_large") return t("errors.fileTooLarge");
    if (code === "unsupported_file_type") return t("errors.unsupportedFile");
    if (code === "no_extractable_text") return t("errors.noExtractableText");
    if (code === "admin_only") return t("errors.unauthorized");
    return t("errors.ingestFailed");
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || uploading) {
      setNotice({ tone: "error", message: t("errors.fileRequired") });
      return;
    }

    const form = e.currentTarget;
    const body = new FormData(form);
    body.set("file", file);
    setUploading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ingest_failed");
      setNotice({
        tone: "success",
        message: t("uploadSuccess", {
          title: data.title ?? file.name,
          count: data.chunkCount ?? 0,
        }),
      });
      form.reset();
      setFile(null);
      await refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: uploadError(error instanceof Error ? error.message : undefined),
      });
    } finally {
      setUploading(false);
    }
  }

  async function saveAiKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const key = aiKey.trim();
    if (!key || savingKey) return;
    setSavingKey(true);
    setAiNotice(null);
    try {
      const res = await fetch("/api/admin-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "settings_update_failed");
      setAiConfigured(true);
      setAiHint(data.hint ?? null);
      setAiKey("");
      setAiNotice({ tone: "success", message: t("ai.saved") });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "invalid_anthropic_key"
          ? t("ai.invalid")
          : t("ai.saveFailed");
      setAiNotice({ tone: "error", message });
    } finally {
      setSavingKey(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin-login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cantek-border pb-4">
        <p className="text-sm text-cantek-muted">{t("securityNote")}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="border border-cantek-border bg-white px-3 py-2 text-sm font-bold text-cantek-dark transition hover:border-cantek-dark"
        >
          {tech("signOut")}
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={onUpload} className="cantek-form grid gap-5">
          <div>
            <p className="cantek-kicker text-cantek-cyan">{t("uploadKicker")}</p>
            <h2 className="mt-1 text-2xl font-bold text-cantek-text">
              {t("uploadTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-cantek-muted">
              {t("uploadHelp")}
            </p>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold">{t("file")}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files[0] ?? null);
              }}
              className={`grid min-h-40 w-full place-items-center border-2 border-dashed px-5 py-6 text-center transition ${
                dragging
                  ? "border-cantek-cyan bg-cantek-cyan/5"
                  : "border-cantek-border bg-cantek-light hover:border-cantek-cyan"
              }`}
            >
              <span>
                <span className="block text-lg font-bold text-cantek-dark">
                  {file ? file.name : t("dropTitle")}
                </span>
                <span className="mt-2 block text-sm text-cantek-muted">
                  {file
                    ? `${formatBytes(file.size)} · ${t("readyToIndex")}`
                    : t("dropHelp")}
                </span>
              </span>
            </button>
            <input
              ref={inputRef}
              name="file"
              type="file"
              accept=".pdf,.docx,.md,.txt"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <label className="grid gap-2 text-sm font-semibold">
            {t("titleLabel")}
            <input name="title" placeholder={t("titlePlaceholder")} />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("visibility")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["repair", "internal"] as const).map((visibility) => (
                <label
                  key={visibility}
                  className="flex cursor-pointer gap-3 border border-cantek-border bg-white p-3 transition has-checked:border-cantek-cyan has-checked:bg-cantek-cyan/5"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={visibility}
                    defaultChecked={visibility === "repair"}
                    className="mt-1 h-4 w-4 accent-cantek-cyan"
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      {t(visibility)}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-cantek-muted">
                      {t(`${visibility}Help`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              {t("language")}
              <select name="language" defaultValue="en">
                {locales.map((code) => (
                  <option key={code} value={code}>
                    {localeLabels[code]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t("version")}
              <input name="version" placeholder={t("versionPlaceholder")} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t("equipment")}
              <input name="equipment" placeholder={t("equipmentPlaceholder")} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t("refrigerant")}
              <input name="refrigerant" placeholder={t("refrigerantPlaceholder")} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!file || uploading}
              className="cantek-button"
            >
              {uploading ? t("indexing") : t("upload")}
            </button>
            {notice && (
              <p
                role="status"
                className={`text-sm ${
                  notice.tone === "success" ? "text-emerald-700" : "text-cantek-red"
                }`}
              >
                {notice.message}
              </p>
            )}
          </div>
        </form>

        <div className="space-y-6">
          <form onSubmit={saveAiKey} className="cantek-form grid gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cantek-kicker text-cantek-cyan">{t("ai.kicker")}</p>
                <h2 className="mt-1 text-2xl font-bold">{t("ai.title")}</h2>
              </div>
              <span
                className={`mt-1 inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-bold ${
                  aiConfigured
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-cantek-border bg-cantek-light text-cantek-muted"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    aiConfigured ? "bg-emerald-500" : "bg-cantek-muted"
                  }`}
                />
                {aiConfigured ? t("ai.connected") : t("ai.notConfigured")}
              </span>
            </div>
            <p className="text-sm leading-6 text-cantek-muted">
              {t("ai.description")}
            </p>
            {aiHint && (
              <p className="border-s-[3px] border-cantek-cyan bg-cantek-light px-3 py-2 font-mono text-xs text-cantek-dark">
                {aiHint}
              </p>
            )}
            <label className="grid gap-2 text-sm font-semibold">
              {t("ai.keyLabel")}
              <input
                type="password"
                value={aiKey}
                onChange={(event) => setAiKey(event.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!aiKey.trim() || savingKey}
                className="cantek-button"
              >
                {savingKey ? t("ai.testing") : t("ai.save")}
              </button>
              {aiNotice && (
                <p
                  role="status"
                  className={`text-sm ${
                    aiNotice.tone === "success"
                      ? "text-emerald-700"
                      : "text-cantek-red"
                  }`}
                >
                  {aiNotice.message}
                </p>
              )}
            </div>
          </form>

          <section className="border border-cantek-border bg-white shadow-[0_8px_24px_rgb(50_62_72_/_7%)]">
            <div className="flex items-center justify-between gap-3 border-b border-cantek-border px-5 py-4">
              <div>
                <p className="cantek-kicker text-cantek-cyan">{t("libraryKicker")}</p>
                <h2 className="mt-1 text-xl font-bold">{t("indexed")}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoadingDocs(true);
                  void refresh();
                }}
                disabled={loadingDocs}
                className="border border-cantek-border px-3 py-2 text-sm font-bold text-cantek-dark transition hover:border-cantek-cyan hover:text-cantek-cyan disabled:opacity-50"
              >
                {loadingDocs ? t("loading") : t("refresh")}
              </button>
            </div>

            {loadingDocs ? (
              <p className="px-5 py-8 text-sm text-cantek-muted">{t("loading")}</p>
            ) : docs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-lg font-bold text-cantek-dark">{t("emptyTitle")}</p>
                <p className="mt-2 text-sm text-cantek-muted">{t("emptyHelp")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-start text-sm">
                  <thead className="bg-cantek-light text-xs text-cantek-muted">
                    <tr>
                      <th className="px-5 py-3 text-start font-bold">{t("document")}</th>
                      <th className="px-3 py-3 text-start font-bold">{t("language")}</th>
                      <th className="px-3 py-3 text-start font-bold">{t("visibility")}</th>
                      <th className="px-5 py-3 text-end font-bold">{t("sections")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cantek-border">
                    {docs.map((doc) => (
                      <tr key={doc.id} className="align-top hover:bg-cantek-light/60">
                        <td className="px-5 py-4">
                          <span className="block font-bold text-cantek-dark">
                            {doc.title}
                          </span>
                          <span className="mt-1 block text-xs text-cantek-muted">
                            {[doc.equipment, doc.version].filter(Boolean).join(" · ") ||
                              t("unclassified")}
                          </span>
                        </td>
                        <td className="px-3 py-4 uppercase text-cantek-muted">
                          {doc.language}
                        </td>
                        <td className="px-3 py-4">
                          <span className="border border-cantek-border bg-cantek-light px-2 py-1 text-xs font-bold text-cantek-dark">
                            {t(doc.visibility === "internal" ? "internalShort" : "repairShort")}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-end text-cantek-muted">
                          {doc.chunkCount ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
