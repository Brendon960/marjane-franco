import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';

/** Chamada final antes do rodapé — último ponto de conversão da página. */
export function Contact() {
  return (
    <section id="contato" aria-labelledby="contato-title" className="pb-20 sm:pb-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-rose-deep to-rose-darker px-6 py-14 text-center text-white shadow-lift sm:px-12 sm:py-20">
          <div aria-hidden className="absolute -top-20 -left-20 size-72 rounded-full border border-white/15" />
          <div aria-hidden className="absolute -right-16 -bottom-24 size-80 rounded-full bg-white/5" />
          <p className="eyebrow relative text-nude">Agende seu horário</p>
          <h2 id="contato-title" className="relative mx-auto mt-4 max-w-2xl text-4xl leading-tight font-medium sm:text-5xl">
            Pronta para cuidar de você?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">
            Veja os horários disponíveis e reserve o seu em poucos passos — ou fale comigo pelo WhatsApp.
          </p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/agendar" variant="light" size="lg" icon="calendar">
              Agendar horário
            </Button>
            <Button href={whatsappUrl()} variant="whatsapp" size="lg" icon="whatsapp">
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
