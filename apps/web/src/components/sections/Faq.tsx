import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { site } from '../../config/site';
import { useBusinessInfo } from '../../hooks/useSiteData';
import { whatsappUrl } from '../../lib/whatsapp';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

export function Faq() {
  const info = useBusinessInfo();
  const payment = info?.paymentMethods.length
    ? `Aceitamos: ${info.paymentMethods.join(', ')}.`
    : 'As formas de pagamento são informadas no atendimento. Se preferir, consulte pelo WhatsApp antes de agendar.';
  const hold = info?.pendingHoldHours ?? 12;

  const items: { q: string; a: ReactNode }[] = [
    {
      q: 'Como faço para agendar?',
      a: (
        <>
          Pela <Link to="/agendar" className="text-rose-deep underline">agenda online</Link>: escolha o procedimento, o dia e o
          horário livre, preencha seus dados e envie a confirmação pelo WhatsApp. Se preferir, fale direto no{' '}
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="text-rose-deep underline">WhatsApp</a>.
        </>
      ),
    },
    {
      q: 'Meu horário já fica garantido quando agendo pelo site?',
      a: `O horário fica reservado para você por ${hold} horas. Nesse período, envie a mensagem de confirmação pelo WhatsApp — o agendamento é confirmado pela nossa equipe.`,
    },
    {
      q: 'Posso cancelar ou remarcar meu horário?',
      a: 'Sim. Entre em contato pelo WhatsApp com antecedência para cancelar ou escolher um novo horário.',
    },
    { q: 'Quais formas de pagamento são aceitas?', a: payment },
    {
      q: 'Preciso de avaliação antes do procedimento?',
      a: 'Procedimentos injetáveis (como botox, preenchimentos, PEIM e enzimas) e tratamentos com medicamentos são sempre precedidos de avaliação. É nela que definimos se há indicação, qual técnica usar e quais cuidados tomar.',
    },
    {
      q: 'Como funciona a depilação a laser?',
      a: 'O laser age sobre o folículo do pelo para reduzir o crescimento de forma progressiva. Por isso o tratamento é feito em sessões, com intervalos definidos de acordo com a área e o tipo de pele e de pelo. A quantidade de sessões varia de pessoa para pessoa.',
    },
    {
      q: 'O melasma tem tratamento?',
      a: 'O melasma é uma condição que pede cuidado contínuo. O tratamento busca controlar e clarear as manchas, combinando procedimentos e cuidados diários — como a proteção solar. O plano é individual e definido na avaliação.',
    },
    {
      q: 'Como funciona o acompanhamento para emagrecimento com Mounjaro®?',
      a: 'O Mounjaro® é um medicamento de uso sob prescrição. A primeira etapa é uma consulta de avaliação da sua saúde e do seu histórico, para definir se há indicação. Não há promessa de resultado: cada organismo responde de uma forma.',
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading
            id="faq-title"
            align="left"
            eyebrow="Dúvidas"
            title={
              <>
                Perguntas <span className="text-rose-deep italic">frequentes</span>
              </>
            }
            description="Não encontrou sua dúvida? Fale com a gente pelo WhatsApp."
          />
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 font-semibold text-rose-deep hover:underline">
            <Icon name="whatsapp" size={18} /> {site.whatsapp.display}
          </a>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Icon name="chevronDown" size={20} className="shrink-0 text-gold transition duration-300 group-open:rotate-180" />
              </summary>
              <p className="pb-6 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
