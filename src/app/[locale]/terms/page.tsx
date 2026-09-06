import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of Cantek Diagnostics.",
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalDocument
      eyebrow="Effective 6 September 2026"
      title="Terms of Service"
      summary="These terms govern access to Cantek Diagnostics, operated by Cantek Soğutma Anonim Şirketi (“Cantek”, “we”, “us”). By using the service, you agree to these terms."
      sections={[
        {
          title: "1. Service and eligibility",
          paragraphs: [
            "The service helps users locate information in authorized Cantek documentation and prepare diagnostic or service requests. You must be legally capable of accepting these terms. Staff areas may be used only by accounts expressly authorized by Cantek.",
          ],
        },
        {
          title: "2. Safety and professional judgment",
          paragraphs: [
            "The service is an informational aid, not an emergency service and not a substitute for the current equipment manual, site risk assessment, permit-to-work process, applicable law, or a qualified technician’s judgment.",
            "Do not use the service to perform hazardous work. Refrigerants, ammonia, electricity, pressure systems, hot work, confined spaces, and moving machinery require trained and authorized personnel. In an emergency, evacuate and contact local emergency services and the site emergency team.",
          ],
        },
        {
          title: "3. Accounts and access",
          items: [
            "Keep credentials confidential and use individual authorized accounts only.",
            "Notify Cantek promptly if credentials or equipment data may have been compromised.",
            "Cantek may suspend access to protect users, systems, data, or legal compliance.",
          ],
        },
        {
          title: "4. Acceptable use",
          items: [
            "Do not bypass access controls, probe for vulnerabilities, disrupt the service, or upload malicious files.",
            "Do not submit information you lack the right to use, including third-party confidential material or unnecessary personal data.",
            "Do not rely on the service to defeat safety controls, regulatory duties, warranties, or manufacturer requirements.",
          ],
        },
        {
          title: "5. User submissions",
          paragraphs: [
            "You retain rights in material you submit. You grant Cantek the limited rights needed to process that material, provide support, secure the service, and comply with law. Staff must classify and upload documents in accordance with Cantek information-security policy.",
          ],
        },
        {
          title: "6. Intellectual property",
          paragraphs: [
            "The service, Cantek trademarks, logo, documentation, and related content are owned by Cantek or its licensors. No rights are granted except the limited right to use the service under these terms.",
          ],
        },
        {
          title: "7. Availability and warranties",
          paragraphs: [
            "Cantek may change, suspend, or discontinue features. To the maximum extent permitted by law, the service is provided as available and without warranties that every result is complete, current, or suitable for a particular installation. Mandatory statutory rights are not affected.",
          ],
        },
        {
          title: "8. Liability",
          paragraphs: [
            "Nothing in these terms excludes liability that cannot lawfully be excluded. To the maximum extent permitted by law, Cantek is not liable for indirect or consequential loss arising from misuse, unauthorized work, inaccurate user input, outdated documentation, or failure to follow site-specific safety procedures.",
          ],
        },
        {
          title: "9. Governing law",
          paragraphs: [
            "These terms are governed by the laws of the Republic of Türkiye. Courts and enforcement offices in Antalya have jurisdiction, subject to any mandatory consumer or other jurisdictional rights that apply.",
          ],
        },
        {
          title: "10. Contact and changes",
          paragraphs: [
            "Cantek may update these terms by posting a new effective date. Questions may be sent to info@cantekgroup.com or Cantek Soğutma A.Ş., Organized Industrial Zone, 2nd Section, 21st Street, No:1, Döşemealtı, Antalya 07177, Türkiye.",
          ],
        },
      ]}
    />
  );
}
