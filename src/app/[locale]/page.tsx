import { ChatPanel } from "@/components/ChatPanel";
import { FirstVisitGate } from "@/components/FirstVisitGate";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

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

      <section className="cantek-hero-mosaic">
        <div className="absolute inset-0 grid grid-cols-3" aria-hidden="true">
          <div className="relative overflow-hidden">
            <Image
              src="/cantek-industrial-1.jpg"
              alt=""
              fill
              loading="eager"
              sizes="33vw"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden border-x border-white/25">
            <Image
              src="/cantek-industrial-2.jpg"
              alt=""
              fill
              loading="eager"
              sizes="34vw"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden">
            <Image
              src="/cantek-industrial-3.jpg"
              alt=""
              fill
              loading="eager"
              sizes="33vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[30rem] max-w-[74rem] items-end px-4 py-8 sm:items-center sm:px-6 sm:py-12">
          <div className="cantek-hero-panel">
            <p className="cantek-status">
              <span className="cantek-pulse-dot" aria-hidden="true" />
              {t("kicker")}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] sm:text-5xl">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
              {t("subhead")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-cantek-border bg-cantek-surface">
        <div className="mx-auto w-full max-w-[74rem] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="cantek-kicker text-cantek-cyan">{t("kicker")}</p>
            <h2 className="section-heading mt-2 text-3xl font-bold text-cantek-text after:mx-auto sm:text-4xl">
              {t("workspaceTitle")}
            </h2>
          </div>
          <div className="mt-8 sm:mt-10">
            <ChatPanel mode="public" />
          </div>
          <p className="mt-6 border border-cantek-border border-s-4 border-s-cantek-cyan bg-white px-4 py-3 text-xs leading-5 text-cantek-muted">
            {t("disclaimer")}
          </p>
        </div>
      </section>
    </main>
  );
}
