import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const STEPS = [
  { title: 'Avaliação', text: 'Análise da sua pele, do histórico e da rotina para entender o seu melasma.' },
  { title: 'Plano individual', text: 'Protocolo combinando procedimentos em consultório e cuidados em casa.' },
  { title: 'Acompanhamento', text: 'Retornos para avaliar a evolução e ajustar o tratamento quando necessário.' },
];

/** Destaque da especialidade principal da profissional (posicionamento do Instagram). */
export function MelasmaHighlight() {
  return (
    <section aria-labelledby="melasma-title" className="relative overflow-hidden bg-ink py-20 text-cream sm:py-28">
      <div aria-hidden className="absolute -top-24 right-0 size-96 rounded-full bg-rose/20 blur-3xl" />
      <div className="container-page relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Especialidade</p>
          <h2 id="melasma-title" className="mt-3 text-4xl leading-tight font-medium sm:text-5xl">
            Cuidado especializado para o <span className="text-rose italic">melasma</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-cream/75">
            O melasma pede paciência, constância e um olhar individual. Por isso o tratamento é construído junto
            com você — com explicações claras sobre cada etapa e expectativas realistas.
          </p>
          <div className="mt-8">
            <Button to="/agendar?procedimento=tratamento-de-melasma" variant="light" size="lg" icon="calendar">
              Agendar avaliação de melasma
            </Button>
          </div>
        </div>

        <ol className="grid gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-5 rounded-3xl border border-cream/10 bg-cream/[0.04] p-6">
              <span className="font-serif text-4xl leading-none text-gold italic">0{i + 1}</span>
              <div>
                <h3 className="flex items-center gap-2 text-2xl">
                  {step.title}
                  {i === 2 && <Icon name="heart" size={18} className="text-rose" />}
                </h3>
                <p className="mt-1.5 text-cream/70">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
