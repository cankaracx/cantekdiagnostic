type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalDocument(props: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ice-dim">
        {props.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-navy sm:text-4xl">
        {props.title}
      </h1>
      <p className="mt-4 text-base leading-7 text-navy/70">{props.summary}</p>

      <div className="mt-10 space-y-9">
        {props.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold text-navy">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-7 text-navy/75">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-navy/75">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
