import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { site } from '../../config/site';
import { cn } from '../../lib/format';
import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const NAV = [
  { label: 'Início', to: '/#inicio' },
  { label: 'Procedimentos', to: '/#procedimentos' },
  { label: 'Sobre', to: '/#sobre' },
  { label: 'Agendamento', to: '/agendar' },
  { label: 'Contato', to: '/#contato' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fecha o menu ao navegar; trava o scroll da página com o menu aberto; Esc fecha.
  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition duration-500',
        scrolled || open ? 'border-b border-line/70 bg-cream/90 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-6">
        <Link to="/#inicio" className="group flex flex-col leading-none" aria-label={`${site.name} — início`}>
          <span className="font-serif text-2xl font-medium tracking-wide text-ink">
            <span className="text-rose-deep italic">Dra.</span> Marjane Franco
          </span>
          <span className="mt-1 text-[0.62rem] font-semibold tracking-[0.3em] text-gold uppercase">Estética · Melasma</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-sm font-medium text-ink/80 transition hover:text-rose-deep after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button to="/agendar" icon="calendar">
            Agendar horário
          </Button>
        </div>

        <button
          type="button"
          className="-mr-2 grid size-11 place-items-center rounded-full text-ink lg:hidden"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-500 lg:hidden',
          open ? 'max-h-[calc(100dvh-4.5rem)] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav aria-label="Menu móvel" className="container-page flex h-[calc(100dvh-4.5rem)] flex-col pt-4 pb-8">
          {NAV.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              className="border-b border-line py-4 font-serif text-3xl text-ink transition hover:text-rose-deep"
              style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-auto grid gap-3">
            <Button to="/agendar" size="lg" icon="calendar">
              Agendar horário
            </Button>
            <Button href={whatsappUrl()} variant="outline" size="lg" icon="whatsapp">
              Falar no WhatsApp
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
