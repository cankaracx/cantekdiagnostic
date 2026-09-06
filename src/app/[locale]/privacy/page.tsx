import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Privacy and KVKK Notice",
  description: "How Cantek Diagnostics processes and protects personal data.",
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalDocument
      eyebrow="Effective 6 September 2026"
      title="Privacy and KVKK Notice"
      summary="Cantek Soğutma Anonim Şirketi is the data controller for personal data processed through Cantek Diagnostics. This notice supplements Cantek’s corporate personal-data notices."
      sections={[
        {
          title: "Data we process",
          items: [
            "Diagnostic questions, equipment details, serial numbers, dispatch notes, and any content you choose to submit.",
            "Staff account identifiers, authorization role, sign-in events, and security records.",
            "Technical data such as IP address, browser type, request time, error logs, locale, and necessary cookie identifiers.",
            "Documents uploaded by authorized staff and metadata assigned to those documents.",
          ],
        },
        {
          title: "Purposes and legal grounds",
          paragraphs: [
            "We process data to provide diagnostics and support, authenticate staff, protect systems, maintain records, improve reliability, establish or defend legal claims, and comply with legal duties.",
            "Depending on the context, processing is based on performance of a contract, compliance with legal obligations, establishment or protection of a right, legitimate interests that do not override your rights, or explicit consent where required under Law No. 6698 on the Protection of Personal Data (KVKK).",
          ],
        },
        {
          title: "Diagnostic content",
          paragraphs: [
            "Diagnostic messages are processed to retrieve relevant documentation and formulate a response. Do not enter names, contact details, health information, trade secrets, passwords, or other data that is unnecessary for diagnosing equipment.",
            "Messages are not intentionally saved in the application database unless an authorized technician creates a handoff record. Infrastructure and contracted processing providers may retain limited logs under their security and retention terms.",
          ],
        },
        {
          title: "Recipients and international transfers",
          paragraphs: [
            "Data may be processed by Cantek group companies, authorized personnel, hosting and database providers, contracted language or response-processing providers, security vendors, professional advisers, and public authorities where legally required.",
            "Some providers may process data outside Türkiye. Cantek uses the transfer mechanism and safeguards required by KVKK and, where applicable, other data-protection laws.",
          ],
        },
        {
          title: "Retention",
          items: [
            "Staff authentication data is retained while the account is active and as needed for security and legal obligations.",
            "Handoff records are normally retained for up to 24 months, unless a service contract, warranty, dispute, or law requires longer.",
            "Security and operational logs are normally retained for up to 90 days, subject to provider settings and incident needs.",
            "Uploaded technical documents remain until replaced or deleted by authorized staff under Cantek records policy.",
          ],
        },
        {
          title: "Security",
          paragraphs: [
            "We use role-based access controls, encrypted transport, restricted administrative access, logging, and vendor safeguards. No system is completely secure; report suspected exposure promptly to info@cantekgroup.com.",
          ],
        },
        {
          title: "Your rights",
          paragraphs: [
            "Under Article 11 of KVKK, you may ask whether your data is processed, request information, learn the purpose and recipients, request correction or deletion where applicable, object to certain automated outcomes, and seek compensation for unlawful processing. Additional rights may apply under the GDPR or local law.",
            "Submit a request with sufficient identity-verification information to info@cantekgroup.com or in writing to the address below. We will respond under applicable law.",
          ],
        },
        {
          title: "Children",
          paragraphs: [
            "This industrial service is not directed to children and should not be used to submit children’s personal data.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Cantek Soğutma A.Ş., Organized Industrial Zone, 2nd Section, 21st Street, No:1, Döşemealtı, Antalya 07177, Türkiye. Email: info@cantekgroup.com. Telephone: +90 242 258 17 00.",
            "The full corporate KVKK notice is also available on cantekgroup.com.",
          ],
        },
      ]}
    />
  );
}
