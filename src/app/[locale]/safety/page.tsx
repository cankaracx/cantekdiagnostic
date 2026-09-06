import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Safety Notice",
  description: "Important safety limits for Cantek Diagnostics.",
};

export default async function SafetyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalDocument
      eyebrow="Read before use"
      title="Safety Notice"
      summary="Industrial refrigeration and food-processing equipment can expose people to toxic refrigerants, high pressure, electricity, fire, moving machinery, extreme temperatures, and confined-space hazards."
      sections={[
        {
          title: "Not an emergency service",
          paragraphs: [
            "For an ammonia or refrigerant release, fire, explosion risk, person down, or other active emergency: move away from the hazard, evacuate, and call local emergency services and the site emergency team. Move upwind from a suspected release and do not enter the area or operate electrical switches.",
          ],
        },
        {
          title: "Authorized personnel only",
          paragraphs: [
            "Only appropriately trained, certified, equipped, and authorized personnel may isolate energy, open a pressure system, recover or charge refrigerant, perform hot work, enter a confined space, defeat interlocks, or service live electrical equipment.",
          ],
        },
        {
          title: "Use controlling documents",
          items: [
            "Use the latest manual and drawings for the exact model, serial number, refrigerant, controls, and site configuration.",
            "Follow the site risk assessment, lockout/tagout program, permit-to-work system, PPE requirements, and local law.",
            "Verify that retrieved information matches the current controlled document before acting.",
            "Stop if equipment identity, units, values, or conditions are uncertain.",
          ],
        },
        {
          title: "Limits of diagnostic guidance",
          paragraphs: [
            "Responses may be incomplete, outdated, mistranslated, or based on insufficient input. They do not authorize work and do not replace competent professional judgment. Cantek service should confirm any safety-critical value or procedure.",
          ],
        },
        {
          title: "Cantek service",
          paragraphs: [
            "Telephone: +90 242 258 17 00. Email: info@cantekgroup.com. Emergency services must be contacted first for an active emergency.",
          ],
        },
      ]}
    />
  );
}
