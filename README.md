# Site — Dra. Marjane Franco

Landing page + agenda online + painel administrativo para a Dra. Marjane Franco (Instagram [@dramarjanefranco](https://www.instagram.com/dramarjanefranco/)).

Fluxo: **Instagram → Site → Procedimento → Data e horário → Pré-reserva (PENDENTE) → Dra. Marjane confirma no painel → E-mail de confirmação para a cliente**.

> Segurança: leia também o [SECURITY.md](SECURITY.md). Nenhum segredo (senha, token, `DATABASE_URL` real) vai para o Git — só para `apps/api/.env`, que é ignorado.

---

## Arquitetura

Monorepo com npm workspaces, 100% TypeScript.

```
packages/shared   Validação (Zod), permissões, telefone, datas e catálogo — usados pelo site E pela API
apps/api          API REST: Fastify 5 + Prisma 6 + PostgreSQL
  src/modules/<módulo>/   controller (rotas) → service (regras) → repository (banco)
  src/lib/                prisma, erros, validação, regras de segurança
  prisma/                 schema.prisma, migrations SQL e seed
  scripts/create-user.ts  cria o primeiro acesso (Super Administrador)
apps/web          Site + painel: React 19 + React Router 7 + Vite + Tailwind 4
  src/config/site.ts      textos, contatos e links editáveis
  src/components/         ui/ · layout/ · sections/ (landing) · booking/ (agendamento)
  src/admin/              painel (/admin e /super-admin) — carregado sob demanda
  security-headers.ts     cabeçalhos de segurança de produção (CSP etc.)
```

- **Banco:** PostgreSQL. A constraint `appointments_no_overlap` impede dois agendamentos sobrepostos, mesmo com pedidos simultâneos.
- **Sessão do painel:** cookie `httpOnly` + `SameSite=Strict`; o banco guarda só o hash do token.
- **E-mail:** SMTP (Nodemailer), apenas no servidor.

## Requisitos

- **Node.js 22+** (testado com 24) e **npm 10+**
- **PostgreSQL 14+** — ex.: [Neon](https://neon.tech) ou [Supabase](https://supabase.com) (plano gratuito) ou local
- (Opcional) conta de e-mail com SMTP para os e-mails de confirmação/cancelamento

## Instalação

```bash
npm install
cp apps/api/.env.example apps/api/.env    # depois edite com os SEUS valores
cp apps/web/.env.example apps/web/.env    # opcional (pode ficar vazio)
```

> npm 11 pode pedir aprovação de scripts de instalação: aprove para `prisma`, `@prisma/client`, `@prisma/engines` e `esbuild` (`npm approve-scripts`).

## Configuração (variáveis de ambiente)

Todas ficam em `apps/api/.env` (API) e `apps/web/.env` (site). Os modelos comentados estão em `apps/api/.env.example` e `apps/web/.env.example`. **Nunca versione os arquivos `.env`.**

### API — `apps/api/.env`

| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `DATABASE_URL` | sim | Conexão do PostgreSQL | `postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=require` |
| `PORT` | não | Porta da API (padrão 3333) | `3333` |
| `HOST` | não | Vazio = `127.0.0.1` em dev e `0.0.0.0` em produção | |
| `NODE_ENV` | não | `development` ou `production` (ativa cookie `Secure`/`__Host-`) | `production` |
| `WEB_ORIGIN` | sim em produção | Origem **exata** do site (CORS/CSRF); várias separadas por vírgula; `*` não é aceito | `https://www.seudominio.com.br` |
| `TRUST_PROXY` | não | Nº de proxies na frente da API (ou IPs/CIDR). `false` = nenhum | `1` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | para e-mail | Servidor SMTP | `smtp.gmail.com` / `587` / `false` |
| `SMTP_USER` / `SMTP_PASS` | para e-mail | Conta e senha (no Gmail, **senha de app**) | `seu@gmail.com` / *(segredo)* |
| `EMAIL_FROM` | não | Remetente exibido (padrão: `SMTP_USER`) | `Dra. Marjane Franco <contato@seudominio.com.br>` |
| `EMAIL_REPLY_TO` / `ADMIN_EMAIL` | não | Respostas das clientes / e-mail do administrador | `contato@seudominio.com.br` |
| `CLINIC_WHATSAPP_NUMBER` | não | WhatsApp da clínica mostrado nos e-mails | `5531999999999` |

Sem SMTP configurado o sistema funciona normalmente; o painel apenas indica que o e-mail não foi enviado.

### Site — `apps/web/.env`

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Deixe **vazio** (o site chama `/api` no mesmo domínio). O login exige API no mesmo domínio. |
| `VITE_SITE_URL` | Domínio público (URL canônica de SEO), ex.: `https://www.seudominio.com.br` |

> Tudo que começa com `VITE_` vai para o navegador: **nunca** coloque segredos nessas variáveis.

## Banco de dados e migrations

```bash
npm run db:migrate     # aplica as migrations pendentes (prisma migrate deploy) — não apaga dados
npm run db:seed        # procedimentos, expediente e feriados iniciais (idempotente, sem dados pessoais)
```

- Toda mudança de estrutura é feita por **Prisma Migration** (`apps/api/prisma/migrations/`). Não use `prisma db push` em produção.
- Para criar uma migration nova em desenvolvimento: `npm run db:migrate:dev -w @mf/api`.
- Visualizar o banco localmente: `npm run db:studio -w @mf/api`.

## Execução

```bash
npm run dev            # API em http://127.0.0.1:3333 e site em http://localhost:5173
```

Primeiro acesso ao painel — cria o Super Administrador e mostra uma **senha provisória uma única vez** (não existe senha padrão no código):

```bash
npm run user:create -- --name "Seu Nome" --email voce@exemplo.com --role SUPER_ADMIN
```

Entre em `/admin/login`: o painel exige a **troca da senha provisória** antes de liberar qualquer função. Depois, crie a usuária da Dra. Marjane (perfil **Administradora**) em `/super-admin/usuarios` — ela também troca a senha no primeiro acesso.

## Testes

```bash
npm test               # testes unitários (shared + API)
npm run typecheck      # TypeScript em todos os pacotes
```

## Build

```bash
npm run build                        # API (apps/api/dist) e site (apps/web/dist)
npm start -w @mf/api                 # roda a API compilada
npm run preview -w @mf/web           # serve o build do site em :4173 com os cabeçalhos de produção
```

## Perfis de acesso

| Perfil | Acesso |
|---|---|
| **Cliente** (sem login) | Site público, agendamento e o link privado “gerenciar meu agendamento” (ver, cancelar até X horas antes, pedir alteração pelo WhatsApp) |
| **Administradora** (`ADMIN`) | `/admin`: dashboard, agenda, agendamentos, clientes, procedimentos, fotos, horários, bloqueios e configurações da clínica |
| **Super Administrador** (`SUPER_ADMIN`) | Tudo da Administradora + `/super-admin`: usuários, logs de auditoria, estado do sistema e configurações técnicas |

As permissões ficam em `packages/shared/src/permissions.ts`. **Quem bloqueia é a API** (`requirePermission` em cada rota); a interface só esconde o que a pessoa não pode usar.

## Decisões importantes

- **Pré-reserva.** Ao agendar no site, o horário fica `PENDING` e sai da agenda pública por `pending_hold_hours` (padrão 12h). A Dra. Marjane confirma no painel e a cliente recebe o e-mail de confirmação. Pré-reservas vencidas são liberadas automaticamente.
- **Sem conflito de horários, em 3 camadas:** a agenda só mostra horários em que o procedimento inteiro cabe; a API recalcula dentro da transação; a constraint `appointments_no_overlap` rejeita qualquer sobreposição.
- **Validação única:** o mesmo schema Zod valida o formulário e a API.
- **Fuso fixo America/Sao_Paulo (-03:00):** o Brasil não tem horário de verão desde 2019.
- **Saúde:** injetáveis e Mounjaro® aparecem sempre como “mediante avaliação”; nenhum texto promete resultado.

## E-mails para a cliente

- **Confirmação:** um clique em **Confirmar agendamento** muda para CONFIRMADO e envia o e-mail ao contato informado naquele agendamento. Solicitar horário pelo site não envia confirmação.
- **Cancelamento (individual e em massa):** cada cliente recebe o próprio aviso (procedimento, data, horário, motivo e WhatsApp para remarcar). Na Agenda: filtros, seleção múltipla, “Cancelar agendamentos selecionados” e “Cancelar todos os agendamentos deste dia”, com resumo ao final.
- Falha de envio nunca desfaz a confirmação/cancelamento; o painel oferece **Enviar novamente**. Não há envio duplicado (recarregar a página ou clicar de novo não reenvia).

| Provedor | `SMTP_HOST` | `SMTP_PORT` / `SMTP_SECURE` | `SMTP_USER` / `SMTP_PASS` |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` / `false` | o Gmail / uma **senha de app** (Conta Google → Segurança → Verificação em 2 etapas → Senhas de app) |
| Outlook/Hotmail | `smtp-mail.outlook.com` | `587` / `false` | o e-mail / a senha |
| Domínio próprio | o informado pelo provedor | normalmente `465` / `true` ou `587` / `false` | o e-mail / a senha |

Para melhor entrega, prefira um e-mail no domínio da clínica ou um serviço transacional com SMTP (Brevo, Amazon SES, Resend).

## Segurança (resumo)

Detalhes, como reportar vulnerabilidades e boas práticas em [SECURITY.md](SECURITY.md).

- Senhas em **Argon2id**; senha provisória exige troca no primeiro acesso.
- Sessão em cookie `httpOnly` + `SameSite=Strict` (+ `Secure`/`__Host-` em produção), expiração por inatividade e por tempo total; troca de senha/desativação encerra sessões.
- CSRF (verificação de `Origin`), CORS restrito, permissões checadas no servidor.
- Rate limit: 120 req/min geral; login 10/15 min por IP e 5 por e-mail; agendamento 20/hora por IP, máx. 2 pré-reservas por WhatsApp e 3 por e-mail; upload 20/10 min.
- Link privado da cliente: token aleatório (só o hash no banco), expira 30 dias após o agendamento, `Referrer-Policy: no-referrer`.
- O site público nunca altera o cadastro de uma cliente existente (contato salvo no próprio agendamento).
- Ações simultâneas protegidas no banco (condição no UPDATE; trava para nunca ficar sem SUPER_ADMIN).
- Logs sem senhas, tokens, query strings, IPs ou cookies. Auditoria (`audit_logs`) de todas as ações do painel.
- Fotos validadas abrindo a imagem real, convertidas para WEBP sem metadados (remove GPS).
- Cabeçalhos do site em produção (CSP, `frame-ancestors 'none'`, HSTS, nosniff) em `apps/web/public/_headers` e `apps/web/vercel.json`, gerados de `apps/web/security-headers.ts`.

## O que editar antes de publicar

| O quê | Onde |
|---|---|
| Fotos dos procedimentos | Painel → **Fotos** (as de `public/images/procedimentos/` são temporárias, do Unsplash) |
| Fotos do hero e do “sobre” | `apps/web/public/images/` + `src/config/site.ts` |
| Registro profissional, formação | `src/config/site.ts` → `about` |
| Depoimentos reais (com autorização) | `src/config/site.ts` → `testimonials` (e `isDemo: false`) |
| Horário, durações, preços, pagamento, endereço, feriados | Painel → **Horários**, **Procedimentos** e **Configurações** |
| Imagem de compartilhamento (og:image) e domínio | `apps/web/index.html`, `VITE_SITE_URL` |

## Deploy (sugestão)

- **Site:** Vercel / Netlify / Cloudflare Pages — build `npm run build -w @mf/web`, pasta `apps/web/dist`. Os cabeçalhos de segurança e o redirecionamento de rotas já estão em `_headers` / `vercel.json`.
- **API:** Render / Railway / Fly.io — `npm run build -w @mf/api` e `npm start -w @mf/api`, com `DATABASE_URL`, `WEB_ORIGIN`, `NODE_ENV=production`, SMTP e `TRUST_PROXY` = **número real de proxies** na frente da API (normalmente `1`). Um valor maior permitiria ao cliente forjar o próprio IP.
- **Mesmo domínio:** sirva a API em `https://www.seudominio.com.br/api/*` (rewrite/proxy). Com `SameSite=Strict` o login não funciona com site e API em domínios diferentes. Deixe `VITE_API_URL` vazio.
- Rode `npm run db:migrate` a cada deploy que trouxer migrations novas.

## Próximas fases

- Lembretes automáticos, feed do Instagram (Graph API), sitemap/pré-renderização para SEO.
