import { site } from '../../config/site';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

export function Testimonials() {
  const { isDemo, items } = site.testimonials;

  return (
    <section aria-labelledby="depoimentos-title" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="depoimentos-title"
          eyebrow="Depoimentos"
          title={
            <>
              O que dizem nossas <span className="text-rose-deep italic">clientes</span>
            </>
          }
        />

        <ul className="-mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {items.map((t, i) => (
            <li key={i} className="w-[85%] shrink-0 snap-center rounded-3xl border border-line bg-white p-7 shadow-soft md:w-auto">
              <div className="flex gap-1 text-gold" aria-label="5 de 5 estrelas">
                {Array.from({ length: 5 }, (_, s) => (
                  <Icon key={s} name="star" size={16} />
                ))}
              </div>
              <blockquote className="mt-5 font-serif text-xl leading-snug text-ink/85 italic">“{t.text}”</blockquote>
              <p className="mt-6 text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted">{t.procedure}</p>
            </li>
          ))}
        </ul>

        {isDemo && (
          <p className="mt-6 text-center text-xs text-muted">
            Exemplos ilustrativos — os depoimentos reais estão nos destaques do{' '}
            <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-rose-deep">
              Instagram
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}
