"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Image from "next/image";

export function AppHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const onTechnician = pathname.startsWith("/tech");
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const handleScroll = () => setElevated(window.scrollY > 4);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = (active: boolean) =>
    `corporate-nav-link ${active ? "corporate-nav-link-active" : ""}`;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-cantek-border bg-white/95 text-cantek-text backdrop-blur-md transition-shadow ${
        elevated ? "app-header-elevated" : ""
      }`}
    >
      <div className="border-b border-cantek-border/70 bg-cantek-light">
        <div className="mx-auto flex min-h-9 max-w-[74rem] items-center justify-between gap-5 px-4 text-xs sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="https://www.cantekgroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-cantek-dark bg-cantek-dark px-2.5 py-1 font-bold text-white transition-colors hover:border-cantek-cyan hover:bg-cantek-cyan"
            >
              Cantek Group
            </a>
            <a href="tel:+902422581700" className="utility-link hidden sm:inline">
              +90 242 258 17 00
            </a>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href="mailto:info@cantekgroup.com"
              className="utility-link hidden md:inline"
            >
              info@cantekgroup.com
            </a>
            <AccountMenu />
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[4.75rem] max-w-[74rem] items-center justify-between gap-5 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-4"
          aria-label="Cantek Diagnostics"
        >
          <Image
            src="/cantek-logo.png"
            alt="Cantek Group"
            width={200}
            height={54}
            loading="eager"
            className="h-auto w-36 sm:w-[12.5rem]"
            style={{ height: "auto" }}
          />
          <span className="hidden border-s border-cantek-border ps-4 text-xs font-bold uppercase tracking-[0.08em] text-cantek-muted sm:inline">
            {t("diagnostics")}
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden self-stretch md:flex"
        >
          <Link href="/" className={navClass(!onTechnician)}>
            {t("diagnostics")}
          </Link>
          <Link href="/tech" className={navClass(onTechnician)}>
            {t("technician")}
          </Link>
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 border border-cantek-border px-3 py-2 text-xs font-bold uppercase tracking-wider text-cantek-dark marker:hidden">
            <span>{t("menu")}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 8h14M5 12h14M5 16h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <nav
            className="absolute end-0 top-[calc(100%+0.5rem)] grid min-w-48 border border-cantek-border bg-white p-2 shadow-xl"
            aria-label="Mobile"
          >
            <Link
              href="/"
              className={`border-s-[3px] px-4 py-3 text-sm font-bold ${
                !onTechnician
                  ? "border-cantek-cyan text-cantek-dark"
                  : "border-transparent text-cantek-muted hover:text-cantek-dark"
              }`}
            >
              {t("diagnostics")}
            </Link>
            <Link
              href="/tech"
              className={`border-s-[3px] px-4 py-3 text-sm font-bold ${
                onTechnician
                  ? "border-cantek-cyan text-cantek-dark"
                  : "border-transparent text-cantek-muted hover:text-cantek-dark"
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
