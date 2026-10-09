import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import { WhatsAppFloat } from './WhatsAppFloat';

/** Ao trocar de rota: rola até a âncora (#sobre) ou volta ao topo. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    // A seção pode ainda estar sendo renderizada (rota carregada sob demanda).
    let tries = 0;
    const scroll = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else if (tries++ < 20) setTimeout(scroll, 50);
    };
    scroll();
  }, [pathname, hash]);

  return null;
}

export function Layout() {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>
      <ScrollManager />
      <Header />
      <main id="conteudo">
        <Suspense fallback={<div className="min-h-dvh" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
