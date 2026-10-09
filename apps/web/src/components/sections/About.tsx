import { site } from '../../config/site';
import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function About() {
  const { about } = site;

  return (
    <section id="sobre" aria-labelledby="sobre-title" className="py-20 sm:py-28">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div aria-hidden className="absolute -inset-4 -rotate-3 rounded-[2.5rem] border border-gold/40" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-linear-to-br from-sand via-nude to-rose/40 shadow-lift">
            {about.image ? (
              <img src={about.image} alt={`Foto de ${site.name}`} loading="lazy" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-rose-deep/40">
                <Icon name="user" size={96} strokeWidth={1} />
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow">Sobre mim</p>
          <h2 id="sobre-title" className="mt-3 text-4xl leading-tight font-medium sm:text-5xl">
            {site.name}
          </h2>
          <p className="mt-2 font-serif text-xl text-rose-deep italic">
            {about.role}
            {about.registration && <span className="ml-2 font-sans text-sm text-muted not-italic">· {about.registration}</span>}
          </p>

          <div className="mt-6 space-y-4 text-[1.05rem] leading-relaxed text-ink/80">
            {about.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-ink">Especialidades</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {about.specialties.map((s) => (
                <li key={s} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm text-ink/80">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {about.education.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">Formação</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {about.education.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/agendar" size="lg" icon="calendar">
              Agendar horário
            </Button>
            <Button href={whatsappUrl()} variant="outline" size="lg" icon="whatsapp">
              Tirar dúvidas
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
