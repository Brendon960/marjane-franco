import { Icon, type IconName } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

const ITEMS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'sparkles', title: 'Especialista em melasma', text: 'Experiência dedicada a uma das condições de pele que mais exigem cuidado individual.' },
  { icon: 'user', title: 'Avaliação individual', text: 'Nenhum procedimento é indicado sem antes entender sua pele, seu histórico e seu objetivo.' },
  { icon: 'heart', title: 'Atendimento acolhedor', text: 'Tempo para ouvir, explicar cada etapa e tirar todas as suas dúvidas.' },
  { icon: 'shield', title: 'Transparência', text: 'Expectativas realistas, sem promessas de resultado — você decide com informação.' },
  { icon: 'calendar', title: 'Hora marcada', text: 'Agenda online com horários reservados só para você, sem espera.' },
  { icon: 'whatsapp', title: 'Acompanhamento próximo', text: 'Canal direto pelo WhatsApp antes e depois do procedimento.' },
];

export function Differentials() {
  return (
    <section aria-labelledby="diferenciais-title" className="bg-sand/50 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="diferenciais-title"
          eyebrow="Por que escolher"
          title={
            <>
              Cuidado em <span className="text-rose-deep italic">cada detalhe</span>
            </>
          }
        />
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <li key={item.title} className="rounded-3xl bg-white p-7 shadow-soft transition duration-500 hover:-translate-y-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-rose/12 text-rose-deep">
                <Icon name={item.icon} size={22} />
              </span>
              <h3 className="mt-5 text-2xl font-medium">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
