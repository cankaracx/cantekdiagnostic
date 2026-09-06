import { ChatPanel } from "@/components/ChatPanel";
import { FirstVisitGate } from "@/components/FirstVisitGate";
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
    <main>
      <FirstVisitGate />
      <section className="cantek-hero">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center bg-cantek-dark px-6 py-14 text-white sm:px-10 lg:min-h-[25rem]">
            <p className="cantek-kicker text-cantek-cyan">{t("kicker")}</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
              {t("subhead")}
            </p>
          </div>
          <div className="cantek-hero-image min-h-64 lg:min-h-[25rem]" aria-hidden="true" />
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
        <p className="cantek-kicker text-cantek-cyan">{t("kicker")}</p>
        <h2 className="mt-2 text-3xl font-bold text-cantek-text">{t("workspaceTitle")}</h2>
        <div className="mt-7">
          <ChatPanel mode="public" />
        </div>
        <p className="mt-6 border-s-4 border-cantek-cyan bg-cantek-light px-4 py-3 text-xs leading-5 text-cantek-muted">
          {t("disclaimer")}
        </p>
      </section>
    </main>
  );
}
