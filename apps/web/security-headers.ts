/**
 * Cabeçalhos de segurança do site (M6). Mesmos valores em:
 *   - public/_headers  (Netlify / Cloudflare Pages)
 *   - vercel.json      (Vercel)
 *   - vite preview     (teste local do build)
 *
 * CSP liberando só o que o site usa: scripts e imagens próprios, Google Fonts,
 * `blob:` (pré-visualização de foto no painel) e `data:` (ícones embutidos).
 * Se a API ficar em OUTRO domínio (VITE_API_URL), acrescente-o em connect-src e img-src.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' só para estilos (atributos style do React); scripts continuam bloqueados
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Ninguém pode carregar o site/painel dentro de um iframe (clickjacking)
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
