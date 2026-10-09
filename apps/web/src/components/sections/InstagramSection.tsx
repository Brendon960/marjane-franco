import { site } from '../../config/site';
import { Button } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';

/**
 * Atalhos para os destaques do Instagram. Para exibir fotos reais dos posts,
 * a integração exige conta comercial + app na Meta (Fase 3).
 */
export function InstagramSection() {
  return (
    <section aria-labelledby="instagram-title" className="bg-sand/50 py-20 sm:py-28">
      <div className="container-page text-center">
        <SectionHeading
          id="instagram-title"
          eyebrow={site.instagram.handle}
          title={
            <>
              Siga nosso <span className="text-rose-deep italic">trabalho</span>
            </>
          }
          description="Bastidores, dicas de cuidados, depoimentos e novidades — acompanhe tudo no Instagram."
        />

        <ul className="-mx-5 mt-12 flex gap-5 overflow-x-auto px-5 pb-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
          {site.instagram.highlights.map((h) => (
            <li key={h} className="shrink-0">
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="group flex w-20 flex-col items-center gap-2">
                <span className="rounded-full bg-linear-to-tr from-gold via-rose to-rose-deep p-[2.5px] transition group-hover:scale-105">
                  <span className="grid size-[4.6rem] place-items-center rounded-full border-[3px] border-cream bg-sand text-rose-deep">
                    <span className="font-serif text-2xl italic">{h[0]}</span>
                  </span>
                </span>
                <span className="text-xs text-ink/75">{h}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Button href={site.instagram.url} size="lg" icon="instagram">
            Seguir {site.instagram.handle}
          </Button>
        </div>
      </div>
    </section>
  );
}
