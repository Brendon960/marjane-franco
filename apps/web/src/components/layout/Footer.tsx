import { Link } from 'react-router';
import { site } from '../../config/site';
import { useBusinessInfo } from '../../hooks/useSiteData';
import { summarizeHours } from '../../lib/format';
import { whatsappUrl } from '../../lib/whatsapp';
import { Icon } from '../ui/Icon';

const LINKS = [
  { label: 'Procedimentos', to: '/#procedimentos' },
  { label: 'Sobre', to: '/#sobre' },
  { label: 'Agendar horário', to: '/agendar' },
  { label: 'Perguntas frequentes', to: '/#faq' },
];

export function Footer() {
  const info = useBusinessInfo();
  const hours = info ? summarizeHours(info.hours) : [];

  return (
    <footer className="border-t border-line bg-sand/60 pb-28 sm:pb-12">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl">
            <span className="text-rose-deep italic">Dra.</span> Marjane Franco
          </p>
          <p className="mt-2 text-sm text-muted">{site.tagline}</p>
          <div className="mt-5 flex gap-3">
            <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-10 place-items-center rounded-full border border-line bg-white text-rose-deep transition hover:border-rose">
              <Icon name="instagram" />
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid size-10 place-items-center rounded-full border border-line bg-white text-rose-deep transition hover:border-rose">
              <Icon name="whatsapp" />
            </a>
          </div>
        </div>

        <div>
          <p className="eyebrow">Contato</p>
          <ul className="mt-4 space-y-3 text-sm text-ink/80">
            <li>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-rose-deep">
                <Icon name="whatsapp" size={16} className="text-gold" /> {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-rose-deep">
                <Icon name="instagram" size={16} className="text-gold" /> {site.instagram.handle}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="mapPin" size={16} className="mt-0.5 shrink-0 text-gold" />
              {info?.address ?? 'Endereço informado no agendamento'}
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Atendimento</p>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            {hours.length > 0 ? hours.map((line) => <li key={line}>{line}</li>) : <li>Com hora marcada — consulte pelo WhatsApp</li>}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Links rápidos</p>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-rose-deep">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container-page flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 {site.name} — Todos os direitos reservados.</p>
        <div className="flex gap-5">
          <Link to="/privacidade" className="hover:text-rose-deep">
            Política de privacidade
          </Link>
          <Link to="/termos" className="hover:text-rose-deep">
            Termos de uso
          </Link>
        </div>
      </div>
    </footer>
  );
}
