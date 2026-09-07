import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { RTL_LOCALES } from "@/lib/geo/locales";
import type { AppLocale } from "@/i18n/routing";

const corporateFont = localFont({
  src: "../../fonts/AmsiPro-Bold.otf",
  weight: "400",
  style: "normal",
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
  const footer = await getTranslations("footer");
  const dir = RTL_LOCALES.has(locale as AppLocale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`h-full ${corporateFont.variable}`}>
      <body className="flex min-h-full flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t-4 border-cantek-cyan bg-cantek-dark text-white">
            <div className="mx-auto grid max-w-[74rem] gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
              <div>
                <p className="text-lg font-bold text-white">
                  Cantek Diagnostics
                </p>
                <div className="mt-3 h-0.5 w-10 bg-cantek-cyan" />
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
                  {footer("description")}
                </p>
              </div>
              <div>
                <p className="cantek-kicker text-cantek-cyan">{footer("service")}</p>
                <div className="mt-3 grid gap-2 text-sm text-white/65">
                  <a href="tel:+902422581700" className="transition-colors hover:text-cantek-cyan">+90 242 258 17 00</a>
                  <a href="tel:+905497438721" className="transition-colors hover:text-cantek-cyan">+90 549 743 87 21</a>
                  <a href="mailto:info@cantekgroup.com" className="transition-colors hover:text-cantek-cyan">info@cantekgroup.com</a>
                </div>
              </div>
              <nav aria-label="Legal">
                <p className="cantek-kicker text-cantek-cyan">{footer("corporate")}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-white/65">
                  <Link href="/terms" className="transition-colors hover:text-cantek-cyan">{footer("terms")}</Link>
                  <Link href="/privacy" className="transition-colors hover:text-cantek-cyan">{footer("privacy")}</Link>
                  <Link href="/cookies" className="transition-colors hover:text-cantek-cyan">{footer("cookies")}</Link>
                  <Link href="/safety" className="transition-colors hover:text-cantek-cyan">{footer("safety")}</Link>
                  <Link href="/accessibility" className="transition-colors hover:text-cantek-cyan">{footer("accessibility")}</Link>
                </div>
              </nav>
            </div>
            <div className="border-t border-white/10 bg-cantek-dark-deep px-4 py-4">
              <p className="mx-auto max-w-[74rem] text-xs text-white/50 sm:px-2">
                © 2026 Cantek Soğutma A.Ş. · Antalya, Türkiye
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
