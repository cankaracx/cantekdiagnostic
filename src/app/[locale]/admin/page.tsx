import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminLogin } from "@/components/AdminLogin";
import { isSuperAdminSession } from "@/lib/auth/staff";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const admin = await isSuperAdminSession();

  if (!admin) {
    return (
      <main className="bg-cantek-light px-4 py-16 sm:py-24">
        <AdminLogin />
      </main>
    );
  }

  return (
    <main className="bg-cantek-light px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-s-4 border-cantek-cyan ps-5">
          <p className="cantek-kicker text-cantek-cyan">Restricted</p>
          <h1 className="mt-2 text-3xl font-bold text-cantek-text">{t("title")}</h1>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-cantek-muted">{t("intro")}</p>
        <div className="mt-8"><AdminPanel /></div>
      </div>
    </main>
  );
}
