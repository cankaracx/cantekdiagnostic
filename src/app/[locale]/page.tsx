import { ChatPanel } from "@/components/ChatPanel";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-ice-dim">{t("kicker")}</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-navy md:text-4xl">
        {t("headline")}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-navy/70">{t("subhead")}</p>
      <div className="mt-8">
        <ChatPanel mode="public" />
      </div>
      <p className="mt-6 text-xs leading-5 text-navy/50">{t("disclaimer")}</p>
    </main>
  );
}
