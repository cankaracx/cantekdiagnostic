import type { Metadata } from "next";
import { UserAuthCard } from "@/components/UserAuthCard";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="bg-cantek-light px-4 py-16 sm:py-24">
      <div className="mx-auto flex max-w-5xl justify-center">
        <UserAuthCard />
      </div>
    </main>
  );
}
