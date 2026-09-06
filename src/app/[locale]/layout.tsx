import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { RTL_LOCALES } from "@/lib/geo/locales";
import type { AppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: {
    default: "Cantek Diagnostics",
    template: "%s | Cantek Diagnostics",
  },
  description: "Cold storage diagnostics and repair guidance from Cantek manuals.",
  applicationName: "Cantek Diagnostics",
  referrer: "strict-origin-when-cross-origin",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = RTL_LOCALES.has(locale as AppLocale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-navy/10 bg-white px-4 py-6 text-xs text-navy/60">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
              <p>© 2026 Cantek Soğutma A.Ş. · Antalya, Türkiye</p>
              <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                <Link href="/terms" className="hover:text-navy">Terms</Link>
                <Link href="/privacy" className="hover:text-navy">Privacy & KVKK</Link>
                <Link href="/cookies" className="hover:text-navy">Cookies</Link>
                <Link href="/safety" className="hover:text-navy">Safety</Link>
                <Link href="/accessibility" className="hover:text-navy">Accessibility</Link>
              </nav>
              <a href="mailto:info@cantekgroup.com" className="hover:text-navy">
                info@cantekgroup.com
              </a>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
