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
    <main className="bg-cantek-light px-4 py-10 sm:py-14">
      <article className="mx-auto w-full max-w-4xl border border-cantek-border bg-white p-6 shadow-[0_12px_28px_rgb(50_62_72_/_6%)] sm:p-10">
        <div className="border-s-4 border-cantek-cyan ps-5">
          <p className="cantek-kicker text-cantek-cyan">{props.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-cantek-text sm:text-4xl">
            {props.title}
          </h1>
        </div>
        <p className="mt-6 text-base leading-7 text-cantek-muted">{props.summary}</p>

        <div className="mt-10 space-y-9">
        {props.sections.map((section) => (
          <section key={section.title} className="border-t border-cantek-border pt-6">
            <h2 className="text-xl font-bold text-cantek-text">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-7 text-cantek-muted">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 list-square space-y-2 ps-5 text-sm leading-7 text-cantek-muted marker:text-cantek-cyan">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
        </div>
      </article>
    </main>
  );
}
