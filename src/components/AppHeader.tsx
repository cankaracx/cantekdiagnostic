import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function AppHeader() {
  const t = useTranslations("nav");
  return (
    <header className="border-b border-navy/10 bg-white text-navy">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-4" aria-label="Cantek Diagnostics">
          <Image
            src="/cantek-logo.png"
            alt="Cantek"
            width={180}
            height={45}
            priority
            className="h-auto w-36 sm:w-44"
          />
          <span className="hidden border-s border-navy/15 ps-4 text-xs font-semibold uppercase tracking-[0.14em] text-ice-dim sm:inline">
            {t("diagnostics")}
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-navy/75 hover:text-ice-dim">
            {t("diagnostics")}
          </Link>
          <Link href="/tech" className="text-navy/75 hover:text-ice-dim">
            {t("technician")}
          </Link>
          <Link href="/admin" className="text-navy/75 hover:text-ice-dim">
            {t("admin")}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
