import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "Cookies used by Cantek Diagnostics.",
};

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalDocument
      eyebrow="Effective 6 September 2026"
      title="Cookie Notice"
      summary="Cantek Diagnostics uses only cookies and similar storage needed for language selection, first-visit preferences, account sessions, security, and authorized staff access."
      sections={[
        {
          title: "Cookies in use",
          items: [
            "NEXT_LOCALE remembers your language preference for up to 12 months.",
            "cantek-access-choice is local browser storage that remembers whether you chose an account or guest access, so the first-visit screen is not shown repeatedly. It remains until you clear site data or sign out.",
            "Authentication cookies maintain verified customer or authorized staff sessions, refresh them securely, and protect restricted tools. Their duration depends on the session configuration and sign-out.",
            "Hosting and security infrastructure may set short-lived identifiers needed for traffic management, abuse prevention, or service integrity.",
          ],
        },
        {
          title: "No advertising cookies",
          paragraphs: [
            "The service does not currently use advertising, behavioral profiling, or third-party analytics cookies. If optional analytics or marketing technologies are introduced, this notice and any required consent controls will be updated before they are enabled.",
          ],
        },
        {
          title: "Managing cookies",
          paragraphs: [
            "You can block or delete cookies and local storage through your browser. Blocking necessary storage may prevent preferences from being remembered and can prevent account or staff sign-in from working correctly.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Questions about cookies or personal data may be sent to info@cantekgroup.com.",
          ],
        },
      ]}
    />
  );
}
