import type { ReactNode } from 'react';
import { site } from '../config/site';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/*
 * Textos-base para LGPD. Recomenda-se revisão por profissional da área jurídica
 * antes da publicação.
 */

const PRIVACY: { title: string; body: ReactNode }[] = [
  {
    title: 'Quais dados coletamos',
    body: 'Ao agendar pelo site, coletamos apenas: nome, WhatsApp, e-mail (usado para enviar a confirmação do agendamento), o procedimento, a data e o horário escolhidos e as observações que você decidir escrever. Não pedimos documentos nem informações de saúde pelo site.',
  },
  {
    title: 'Para que usamos',
    body: 'Exclusivamente para organizar a agenda, confirmar, lembrar, remarcar ou cancelar seu atendimento e entrar em contato sobre ele. Não vendemos nem compartilhamos seus dados para fins de marketing.',
  },
  {
    title: 'Base legal',
    body: 'O tratamento é feito com base no seu consentimento e na execução dos procedimentos preliminares ao atendimento que você solicitou (Lei nº 13.709/2018 — LGPD).',
  },
  {
    title: 'Armazenamento e segurança',
    body: 'Os dados ficam em servidores com acesso restrito, protegidos por conexão criptografada. Guardamos o histórico de agendamentos enquanto houver relação de atendimento ou obrigação legal.',
  },
  {
    title: 'Seus direitos',
    body: (
      <>
        Você pode solicitar a qualquer momento a consulta, correção ou exclusão dos seus dados, ou revogar seu
        consentimento, pelo WhatsApp {site.whatsapp.display}.
      </>
    ),
  },
  {
    title: 'Cookies',
    body: 'Este site não utiliza cookies de rastreamento ou publicidade.',
  },
];

const TERMS: { title: string; body: ReactNode }[] = [
  {
    title: 'Agendamento online',
    body: 'O agendamento feito pelo site é uma pré-reserva. O horário fica reservado por tempo limitado e é confirmado após o contato pelo WhatsApp. Sem essa confirmação, o horário pode ser liberado para outras pessoas.',
  },
  {
    title: 'Cancelamentos e remarcações',
    body: 'Pedimos que cancelamentos e remarcações sejam comunicados com antecedência pelo WhatsApp, para que o horário possa ser oferecido a outra pessoa.',
  },
  {
    title: 'Informações sobre procedimentos',
    body: 'O conteúdo do site tem caráter informativo e não substitui a avaliação individual. A indicação de qualquer procedimento depende de avaliação profissional, e os resultados variam de pessoa para pessoa — não há garantia de resultados.',
  },
  {
    title: 'Valores',
    body: 'Os valores dos procedimentos são informados no atendimento ou após avaliação e podem ser alterados sem aviso prévio.',
  },
];

function LegalPage({ title, sections }: { title: string; sections: { title: string; body: ReactNode }[] }) {
  useDocumentMeta(`${title} | ${site.name}`);
  return (
    <article className="pt-28 pb-24 sm:pt-36">
      <div className="container-page max-w-3xl">
        <p className="eyebrow">{site.name}</p>
        <h1 className="mt-3 text-5xl font-medium">{title}</h1>
        <p className="mt-3 text-sm text-muted">Última atualização: outubro de 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl font-medium">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink/80">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

export function PrivacyPage() {
  return <LegalPage title="Política de Privacidade" sections={PRIVACY} />;
}

export function TermsPage() {
  return <LegalPage title="Termos de Uso" sections={TERMS} />;
}
