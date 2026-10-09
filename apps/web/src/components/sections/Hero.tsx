import { site } from '../../config/site';
import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 lg:pb-24">
      {/* fundo decorativo */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-nude/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 -left-48 size-96 rounded-full bg-rose/15 blur-3xl" />

      <div className="container-page relative grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <p className="eyebrow flex items-center gap-3">
            <span className="h-px w-8 bg-gold" /> {site.tagline}
          </p>
          <h1 id="hero-title" className="mt-6 text-5xl leading-[1.02] font-medium sm:text-6xl lg:text-7xl">
            {site.hero.title}
            <br />
            <span className="text-rose-deep italic">{site.hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{site.hero.subtitle}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/agendar" size="lg" icon="calendar">
              Agendar procedimento
            </Button>
            <Button href={whatsappUrl()} variant="outline" size="lg" icon="whatsapp">
              Falar no WhatsApp
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink/75">
            {['Atendimento com hora marcada', 'Avaliação individual', 'Agenda online'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-rose/15 text-rose-deep">
                  <Icon name="check" size={12} strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms] lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[2.5rem] border-[10px] border-white bg-linear-to-b from-nude via-sand to-rose/30 shadow-lift">
            {site.hero.image ? (
              <img
                src={site.hero.image}
                alt={`${site.name} em atendimento`}
                fetchPriority="high"
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <div className="text-center">
                  <span className="block font-serif text-[7rem] leading-none text-white/90 italic drop-shadow-sm">MF</span>
                  <span className="mt-2 block text-xs font-semibold tracking-[0.35em] text-rose-deep/70 uppercase">Estética</span>
                </div>
              </div>
            )}
          </div>

          <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-lift backdrop-blur sm:-left-8">
            <span className="grid size-11 place-items-center rounded-full bg-rose/15 text-rose-deep">
              <Icon name="sparkles" size={22} />
            </span>
            <div>
              <p className="text-xs text-muted">Especialidade</p>
              <p className="font-serif text-lg leading-tight">Tratamento de Melasma</p>
            </div>
          </div>

          <div className="absolute top-10 -right-2 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-soft backdrop-blur sm:flex sm:-right-6">
            <Icon name="calendar" size={18} className="text-gold" />
            <p className="text-sm font-medium">Veja horários livres</p>
          </div>
        </div>
      </div>
    </section>
  );
}
