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
      summary="Cantek Diagnostics currently uses only cookies and similar storage that are necessary for language selection, security, and authorized staff sessions."
      sections={[
        {
          title: "Cookies in use",
          items: [
            "NEXT_LOCALE remembers your language preference for up to 12 months.",
            "Authentication cookies maintain an authorized staff session, refresh it securely, and prevent access to protected tools. Their duration depends on the session configuration and sign-out.",
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
            "You can block or delete cookies through your browser. Blocking necessary cookies may prevent language preferences from being remembered and will prevent staff sign-in from working correctly.",
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
