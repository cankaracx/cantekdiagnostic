"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function AppHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const onTechnician = pathname.startsWith("/tech");
  const navClass = (active: boolean) =>
    `border-b-[3px] px-5 py-3.5 text-sm font-medium transition ${
      active
        ? "border-cantek-cyan text-cantek-dark"
        : "border-transparent text-cantek-muted hover:border-cantek-cyan hover:text-cantek-dark"
    }`;

  return (
    <header className="border-b border-cantek-border bg-white text-cantek-text">
      <div className="bg-cantek-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-cantek-dark">
            <a href="tel:+902422581700" className="utility-link">
              +90 242 258 17 00
            </a>
            <a href="mailto:info@cantekgroup.com" className="utility-link">
              info@cantekgroup.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <AccountMenu />
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-4 py-5 sm:py-6">
        <Link href="/" className="flex items-center gap-5" aria-label="Cantek Diagnostics">
          <Image
            src="/cantek-logo.png"
            alt="Cantek"
            width={180}
            height={45}
            priority
            className="h-auto w-40 sm:w-48"
          />
          <span className="hidden border-s border-cantek-border ps-5 text-sm text-cantek-muted sm:inline">
            {t("diagnostics")}
          </span>
        </Link>
        <a
          href="https://www.cantekgroup.com"
          target="_blank"
          rel="noreferrer"
          className="hidden border border-cantek-dark px-3 py-2 text-sm font-bold text-cantek-dark transition hover:border-cantek-cyan hover:bg-cantek-cyan hover:text-white sm:block"
        >
          Cantek Group ↗
        </a>
      </div>

      <div className="border-t border-cantek-border bg-cantek-light">
        <nav
          aria-label="Primary"
          className="mx-auto hidden max-w-6xl items-center gap-0 px-4 md:flex"
        >
          <Link href="/" className={navClass(!onTechnician)}>
            {t("diagnostics")}
          </Link>
          <Link
            href="/tech"
            className={navClass(onTechnician)}
          >
            {t("technician")}
          </Link>
        </nav>
        <details className="group mx-auto max-w-6xl px-4 md:hidden">
          <summary className="cursor-pointer list-none py-3 text-sm font-bold text-cantek-dark">
            {t("menu")}
          </summary>
          <nav className="grid border-t border-cantek-border pb-3" aria-label="Mobile">
            <Link
              href="/"
              className={`border-s-[3px] px-4 py-3 text-sm ${
                !onTechnician
                  ? "border-cantek-cyan text-cantek-dark"
                  : "border-transparent text-cantek-muted"
              }`}
            >
              {t("diagnostics")}
            </Link>
            <Link
              href="/tech"
              className={`border-s-[3px] px-4 py-3 text-sm ${
                onTechnician
                  ? "border-cantek-cyan text-cantek-dark"
                  : "border-transparent text-cantek-muted"
              }`}
            >
              {t("technician")}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
