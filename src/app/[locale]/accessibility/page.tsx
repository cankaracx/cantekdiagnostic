import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "Cantek Diagnostics accessibility commitment and contact.",
};

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalDocument
      eyebrow="Accessibility"
      title="Accessibility Statement"
      summary="Cantek aims to make this service usable by as many people as possible, including people who use keyboards, screen readers, magnification, or alternative input methods."
      sections={[
        {
          title: "Our approach",
          paragraphs: [
            "We work toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. The service is designed with semantic structure, keyboard-operable controls, visible labels, readable contrast, responsive layouts, and language and direction metadata.",
          ],
        },
        {
          title: "Known limitations",
          paragraphs: [
            "Uploaded third-party manuals, PDFs, and technical diagrams may not be fully accessible. Retrieved technical content may contain abbreviations or formatting inherited from source documents.",
          ],
        },
        {
          title: "Feedback and alternatives",
          paragraphs: [
            "If you encounter a barrier or need information in another format, email info@cantekgroup.com and identify the page, document, and format you need. We will review the request and provide a reasonable alternative where practicable.",
          ],
        },
      ]}
    />
  );
}
