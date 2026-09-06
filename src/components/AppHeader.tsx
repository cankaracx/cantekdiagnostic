import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function AppHeader() {
  const t = useTranslations("nav");
  return (
    <header className="bg-white text-cantek-text">
      <div className="border-b border-cantek-border bg-cantek-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-cantek-muted">
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

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-4 py-5">
        <Link href="/" className="flex items-center gap-5" aria-label="Cantek Diagnostics">
          <Image
            src="/cantek-logo.png"
            alt="Cantek"
            width={180}
            height={45}
            priority
            className="h-auto w-40 sm:w-48"
          />
          <span className="hidden border-s border-cantek-border ps-5 text-xs font-bold uppercase tracking-[0.16em] text-cantek-muted sm:inline">
            {t("diagnostics")}
          </span>
        </Link>
        <a
          href="https://www.cantekgroup.com"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs font-bold uppercase tracking-[0.12em] text-cantek-dark hover:text-cantek-cyan sm:block"
        >
          Cantek Group ↗
        </a>
      </div>

      <div className="bg-cantek-dark text-white">
        <nav
          aria-label="Primary"
          className="mx-auto hidden max-w-6xl items-center gap-0 px-4 md:flex"
        >
          <Link href="/" className="border-b-4 border-cantek-cyan px-5 py-4 text-sm font-bold">
            {t("diagnostics")}
          </Link>
          <Link
            href="/tech"
            className="border-b-4 border-transparent px-5 py-4 text-sm font-bold transition hover:border-cantek-cyan hover:bg-cantek-dark-deep"
          >
            {t("technician")}
          </Link>
        </nav>
        <details className="group mx-auto max-w-6xl px-4 md:hidden">
          <summary className="cursor-pointer list-none py-3 text-sm font-bold uppercase tracking-wider">
            {t("menu")}
          </summary>
          <nav className="grid border-t border-white/15 pb-3" aria-label="Mobile">
            <Link href="/" className="border-s-4 border-cantek-cyan px-4 py-3 text-sm">
              {t("diagnostics")}
            </Link>
            <Link href="/tech" className="border-s-4 border-transparent px-4 py-3 text-sm">
              {t("technician")}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
