import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { RTL_LOCALES } from "@/lib/geo/locales";
import type { AppLocale } from "@/i18n/routing";

const corporateFont = Roboto_Condensed({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-corporate",
});

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
    <html lang={locale} dir={dir} className={`h-full ${corporateFont.variable}`}>
      <body className="flex min-h-full flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t-4 border-cantek-cyan bg-cantek-dark text-white">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
              <div>
                <p className="text-lg font-bold uppercase tracking-[0.12em]">
                  Cantek Diagnostics
                </p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
                  Industrial cold-chain diagnostic support from authorized Cantek service documents.
                </p>
              </div>
              <div>
                <p className="cantek-kicker text-cantek-cyan">Service</p>
                <div className="mt-3 grid gap-2 text-sm text-white/75">
                  <a href="tel:+902422581700" className="hover:text-white">+90 242 258 17 00</a>
                  <a href="tel:+905497438721" className="hover:text-white">+90 549 743 87 21</a>
                  <a href="mailto:info@cantekgroup.com" className="hover:text-white">info@cantekgroup.com</a>
                </div>
              </div>
              <nav aria-label="Legal">
                <p className="cantek-kicker text-cantek-cyan">Corporate</p>
                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-white/75">
                  <Link href="/terms" className="hover:text-white">Terms</Link>
                  <Link href="/privacy" className="hover:text-white">Privacy & KVKK</Link>
                  <Link href="/cookies" className="hover:text-white">Cookies</Link>
                  <Link href="/safety" className="hover:text-white">Safety</Link>
                  <Link href="/accessibility" className="hover:text-white">Accessibility</Link>
                </div>
              </nav>
            </div>
            <div className="border-t border-white/10 px-4 py-4">
              <p className="mx-auto max-w-6xl text-xs text-white/50">
                © 2026 Cantek Soğutma A.Ş. · Antalya, Türkiye
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
