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
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-navy">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-navy/70">{t("intro")}</p>
      <div className="mt-8">{staff ? <TechDesk /> : <StaffLogin />}</div>
    </main>
  );
}
