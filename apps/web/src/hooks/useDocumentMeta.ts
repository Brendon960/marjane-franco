import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { site } from '../config/site';

function setMeta(selector: string, attr: 'content' | 'href', value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * Atualiza título, descrição e URL canônica de cada página.
 * As tags padrão (home) ficam no index.html para prévias de link sem JavaScript.
 */
export function useDocumentMeta(title: string, description?: string) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'content', description, () =>
        Object.assign(document.createElement('meta'), { name: 'description' }),
      );
      setMeta('meta[property="og:description"]', 'content', description, () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:description');
        return m;
      });
    }
    setMeta('meta[property="og:title"]', 'content', title, () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    });
    if (site.url) {
      setMeta('link[rel="canonical"]', 'href', `${site.url.replace(/\/$/, '')}${pathname}`, () =>
        Object.assign(document.createElement('link'), { rel: 'canonical' }),
      );
    }
  }, [title, description, pathname]);
}
