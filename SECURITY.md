# Política de Segurança

Este documento descreve como reportar vulnerabilidades e as regras de segurança do projeto
**Site — Dra. Marjane Franco** (site público, agenda online e painel administrativo).

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** para relatar problemas de segurança.

1. Envie o relato **de forma privada** ao responsável técnico pelo projeto — pelo canal privado
   combinado com a clínica ou pelo recurso *Private vulnerability reporting / Security advisories*
   do repositório no GitHub (aba **Security**).
2. Inclua: descrição do problema, passos para reproduzir, impacto esperado e, se possível,
   uma sugestão de correção.
3. **Não inclua** dados reais de clientes, senhas, tokens ou cookies no relato. Se precisar
   demonstrar, use dados fictícios.
4. Não explore a falha além do necessário para demonstrá-la, não acesse dados de terceiros e
   não degrade o serviço (sem testes de carga/DoS contra o ambiente de produção).

O responsável técnico confirmará o recebimento, avaliará a severidade e informará o andamento
da correção. Pedimos que a falha não seja divulgada antes de corrigida.

## Segredos: o que nunca vai para o Git

Nunca versione, cole em issues, documentação, testes ou logs:

- arquivos `.env` (qualquer variação: `.env.local`, `.env.production`…);
- `DATABASE_URL` real, `SMTP_PASS`, senhas de app, tokens, chaves de API;
- chaves privadas e certificados (`*.pem`, `*.key`, `*.p12`, `*.pfx`…);
- backups, dumps de banco (`*.sql` fora das migrations, `*.dump`), exportações e logs;
- dados reais de clientes (nomes, telefones, e-mails, agendamentos).

O `.gitignore` já bloqueia esses arquivos — **mantenha-o assim**. Apenas os modelos
`apps/api/.env.example` e `apps/web/.env.example` (sem valores reais) são versionados.

**Se um segredo vazar** (commit, chat, print, issue): considere-o comprometido e **troque-o
imediatamente** (nova senha de app SMTP, nova senha do banco etc.). Remover o arquivo depois
não é suficiente, pois o valor continua no histórico.

## Configurando o `.env` com segurança

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # opcional
```

- Preencha os valores **somente** no seu `.env` local ou no painel de variáveis da hospedagem.
- No Gmail, use uma **senha de app** (nunca a senha da conta) e uma conta dedicada à clínica.
- Variáveis `VITE_*` vão para o navegador: nunca coloque segredos nelas.
- Em produção: `NODE_ENV=production`, `WEB_ORIGIN` com a origem exata do site (sem `*`) e
  `TRUST_PROXY` igual ao **número real** de proxies na frente da API (normalmente `1`).
- Cada pessoa usa a própria conta no painel; não compartilhe logins.

## Executando com segurança

- **Desenvolvimento:** a API escuta apenas em `127.0.0.1` por padrão (não fica exposta na rede).
  Use um banco local ou de testes — **nunca** dados reais de produção em ambiente de desenvolvimento.
- **Primeiro acesso:** crie o Super Administrador com `npm run user:create` (gera senha provisória
  exibida uma única vez; não há senha padrão no código). O painel exige a troca no primeiro login.
- **Banco:** alterações de estrutura apenas por Prisma Migration (`npm run db:migrate`);
  não use `prisma db push` nem resets em produção. Faça backups do banco fora do repositório.
- **Produção:** HTTPS obrigatório; site e API no mesmo domínio (o cookie de sessão é `SameSite=Strict`);
  publique os cabeçalhos de segurança (`apps/web/public/_headers` ou `apps/web/vercel.json`).
- **Dependências:** rode `npm audit` periodicamente e aplique correções de patch/minor.
  Upgrades major devem ser avaliados e testados antes.
- **Logs:** a API registra apenas método, caminho e status, sem query string, tokens, IPs ou cookies.
  Não adicione logs com dados pessoais ou segredos.

## Proteções implementadas (resumo)

Senhas em Argon2id · troca obrigatória de senha provisória · sessão em cookie httpOnly + SameSite=Strict
com expiração e revogação · CSRF por verificação de `Origin` · CORS restrito · permissões verificadas no
servidor (RBAC) · rate limiting (login, agendamento, upload) · limite de pré-reservas por WhatsApp/e-mail ·
proteção de conflito de horários no banco · transições de status atômicas · trava para nunca ficar sem
Super Administrador · link privado da cliente com token aleatório (hash no banco) e expiração · logs sem
dados sensíveis · auditoria das ações do painel · validação real de imagens · cabeçalhos de segurança (CSP,
anti-clickjacking, HSTS).

## Riscos residuais conhecidos

- `npm audit` aponta `deepmerge-ts` (via CLI do Prisma, usado apenas em build/deploy, não em execução) e
  `esbuild` (servidor de desenvolvimento do esbuild, não utilizado pelo projeto). Serão resolvidos com
  atualizações compatíveis das ferramentas, sem downgrade do Prisma.
- Limites de tentativa ficam em memória: reiniciam com a API e não são compartilhados entre várias instâncias.
- Não há CAPTCHA no agendamento público; considere Cloudflare Turnstile se houver abuso.

## Escopo

Vulnerabilidades no código deste repositório (site, API, painel e scripts). Problemas em serviços de terceiros
(hospedagem, provedor de e-mail, banco gerenciado) devem ser reportados aos respectivos fornecedores.
