import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { SECURITY_HEADERS } from './security-headers';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em desenvolvimento, /api é encaminhado para a API local (sem CORS).
    // 127.0.0.1 (e não "localhost"): a API escuta só no IPv4 local em desenvolvimento.
    proxy: { '/api': 'http://127.0.0.1:3333' },
    // Anti-clickjacking também em desenvolvimento (a CSP completa fica no preview/produção,
    // porque o modo dev do Vite injeta scripts próprios)
    headers: {
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
    },
  },
  // `npm run preview -w @mf/web`: serve o build com os mesmos cabeçalhos de produção
  preview: {
    proxy: { '/api': 'http://127.0.0.1:3333' },
    headers: SECURITY_HEADERS,
  },
});
