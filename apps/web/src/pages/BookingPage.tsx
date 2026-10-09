import { BookingWizard } from '../components/booking/BookingWizard';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function BookingPage() {
  useDocumentMeta(
    'Agende seu horário | Dra. Marjane Franco',
    'Escolha o procedimento, veja os horários disponíveis e reserve seu atendimento online em poucos passos.',
  );

  return (
    <section aria-labelledby="agendar-title" className="pt-28 pb-24 sm:pt-36">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Agenda online</p>
          <h1 id="agendar-title" className="mt-3 text-5xl leading-tight font-medium sm:text-6xl">
            Agende seu <span className="text-rose-deep italic">horário</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Escolha o procedimento, o dia e o horário que preferir. No final, é só enviar a confirmação pelo WhatsApp.
          </p>
        </div>
        <div className="mt-12">
          <BookingWizard />
        </div>
      </div>
    </section>
  );
}
