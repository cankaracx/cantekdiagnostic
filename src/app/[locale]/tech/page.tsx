import type { Metadata } from "next";
import { StaffLogin } from "@/components/StaffLogin";
import { TechDesk } from "@/components/TechDesk";
import { isStaffSession } from "@/lib/auth/staff";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Technician",
  robots: { index: false, follow: false },
};

export default async function TechPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tech");
  const staff = await isStaffSession();

  return (
    <main className="bg-cantek-light px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-s-4 border-cantek-cyan ps-5">
          <p className="cantek-kicker text-cantek-cyan">Cantek Service</p>
          <h1 className="mt-2 text-3xl font-bold text-cantek-text">{t("title")}</h1>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-cantek-muted">{t("intro")}</p>
        <div className="mt-8">{staff ? <TechDesk /> : <StaffLogin />}</div>
      </div>
    </main>
  );
}
