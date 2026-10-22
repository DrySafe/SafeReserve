# SafeReserve

WebApp de agendamento multi-tenant com React 19, Vite, Tailwind 4, Framer Motion, Supabase, Zustand e TanStack Query. Interface em português, mobile-first, tema escuro padrão e PWA.

## Desenvolvimento

Requer Node.js 22.12+ ou 24 LTS (validado com 24.19.0), npm e, apenas para testes SQL, Docker.

```bash
cd /workspace/SafeReserve
npm ci
npm run dev
```

A raiz `/` é a página da plataforma, com cadastro, login e acesso à demonstração. `/demonstracao` funciona com ou sem Supabase e usa apenas dados fictícios do Studio Aurora; reservas, lista de espera e alterações administrativas ficam em `sessionStorage`. Nenhuma mensagem é enviada nesse modo. Sem configuração Supabase, o cadastro real fica indisponível, mas a página inicial e a demonstração continuam funcionando. Falhas em lojas reais nunca abrem outra loja nem usam dados demonstrativos.

Rotas: `/` (plataforma), `/cadastro`, `/entrar`, `/painel` (minhas lojas), `/criar-loja`, `/demonstracao` e `/demonstracao/admin`. Cada loja real usa exclusivamente `/:tenant` para clientes e `/:tenant/admin` para gestão; `/admin` redireciona para o painel de lojas. Exemplo: `/barbearia-do-joao`. O hostname nunca é interpretado como loja, inclusive em previews da Vercel. Não existe loja padrão na raiz. `vercel.json` configura o fallback SPA para permitir abrir e recarregar esses links diretamente.

## Conectar ao Supabase

As opções `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` foram adicionadas ao rascunho do ambiente. A URL informada é `https://cgmylsxrjzovgwyrncyv.supabase.co`.

1. **Este projeto já foi configurado:** as migrations `202610220001_initial.sql` e `202610220002_owner_onboarding.sql` foram aplicadas. Veja `docs/SUPABASE_SETUP.md`; não reaplique a migration. Somente para um projeto novo, aplique a migration pelo SQL Editor ou CLI e, opcionalmente, `supabase/seed.sql`.
2. Nas configurações do ambiente, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a **publishable key** (`sb_publishable_…`) ou a chave pública legada `anon` do projeto. Localmente, copie `.env.example` para `.env.local` e preencha as duas variáveis. Não coloque valores em commits ou no chat.
3. Reinicie o Vite após preencher as variáveis. Para produção, execute um novo `npm run build`: Vite incorpora variáveis públicas no build. Essas duas opções são públicas por definição; a proteção é feita por RLS. **Nunca use `service_role` ou `sb_secret_…` no front-end.**
4. Para criar sua própria loja, abra `/cadastro`, confirme o e-mail, entre e escolha **Criar uma loja**. O banco cria atomicamente a loja, a membership admin do usuário autenticado, o primeiro serviço e o profissional. O link exclusivo aparece no painel para copiar. Não há escolha de `user_id` ou de papéis no navegador. Para adicionar um administrador a uma loja já existente, o proprietário do banco pode usar:

```sql
insert into public.memberships (tenant_id, user_id, role)
values ('UUID-DO-TENANT', 'UUID-DO-USUARIO-AUTH', 'admin');
```

O cadastro de conta sozinho nunca atribui papel admin. A função autenticada `create_tenant` atribui admin somente ao criador, exclusivamente na loja que está criando; não concede acesso a outros estabelecimentos. Links são únicos, rotas como `admin` e `demonstracao` são reservadas e a criação suporta repetição sem duplicar a loja. Há um limite de 10 lojas administradas por conta. Configure Site URL, URLs de redirecionamento, confirmação de e-mail e SMTP do Supabase Auth. O upsell pós-reserva usa e-mail e senha (mínimo 8 caracteres); não exige cadastro para reservar. Vinculação automática de uma reserva guest a uma conta posterior exige prova de titularidade e não é feita usando só o telefone.

## Permissão para criar o banco pelo ambiente cloud

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` conectam o aplicativo, mas não permitem executar DDL (criar tabelas, funções e políticas). A chave `service_role` também não substitui uma conexão administrativa para migrations.

Para aplicação pela API de gerenciamento, adicione um **Supabase Personal Access Token** com acesso ao projeto à opção segura `SUPABASE_ACCESS_TOKEN` nas configurações do ambiente. Ele é obtido em Supabase Dashboard → Account → Access Tokens. A exigência foi adicionada ao rascunho com destino HTTPS `api.supabase.com`. Salve e publique as alterações do ambiente. Não use prefixo `VITE_`, não cole o token no chat e não o versione.

Com essa credencial disponível, o agente pode inspecionar o schema existente antes de aplicar a migration. O arquivo inicial usa uma transação e restringe alterações de grants às tabelas do SafeReserve; não redefine permissões de outras tabelas. A migration `202610220001_initial.sql` já foi aplicada ao projeto remoto e registrada no histórico `supabase_migrations.schema_migrations`. O catálogo inicial do Studio Aurora foi carregado. Não reaplique a migration inicial; para mudanças posteriores, use migrations novas. Alternativamente, o proprietário pode executar o mesmo arquivo no SQL Editor do Supabase.

## O que está implementado

- Escolha de serviços compatíveis, profissional opcional, datas em faixa horizontal e horários de 15 minutos com destaque de encaixes adjacentes.
- Duração combinada, horários de trabalho por profissional, dias de atendimento e bloqueios. O banco aplica o timezone IANA e impede sobreposição com constraint de exclusão, mesmo em concorrência.
- Checkout guest, normalização de WhatsApp, consentimento, confirmação, total calculado pelo banco e chave de idempotência.
- Admin com Supabase Auth + membership por tenant; agenda, cancelamento/reagendamento, preço/duração/descrição/foto do serviço, catálogo de produtos e popup promocional.
- RLS e chaves estrangeiras compostas por tenant. O público vê o catálogo e a disponibilidade sem nomes/telefones das reservas. Clientes, agendamentos e fila só são lidos pela equipe autorizada. A outbox é exclusiva do servidor.
- Fila FIFO por compatibilidade, ofertas com expiração, lembretes duas horas antes e outbox transacional com lease/backoff. O worker é autenticado e precisa de cron.
- PWA com ícones, manifest, cache do shell e catálogo público por 24h offline. Reservas e dados de clientes não entram no cache do Service Worker. Horários são reconsultados ao reconectar; agendamentos nunca são confirmados offline nem reenviados silenciosamente.
- Instalação oferecida apenas quando o navegador disponibiliza o prompt nativo. Em iOS, use Compartilhar → Adicionar à Tela de Início. Produção exige HTTPS.

A otimização destaca encaixes que começam/terminam junto de reservas existentes ou limites da jornada; não é um otimizador global. Mudanças em preços/durações não alteram as condições de reservas existentes. Produtos têm gestão de catálogo; checkout de produtos não faz parte deste fluxo de serviços. Promoções são comunicadas pelo popup; não há motor de cupons/descontos.

## Integrações e ativação de produção

Veja [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). O envio WhatsApp e a sincronização automática Google exigem implantação/configuração dos serviços externos e consentimento OAuth; os testes locais não comprovaram essas conexões. O link manual “Adicionar ao Google Agenda” já funciona. Não há credenciais secretas nas variáveis Vite.

Antes de abrir o endpoint guest para tráfego público, coloque proteção antiabuso (rate limit por IP e CAPTCHA/Turnstile verificado em Edge Function/API gateway). A RPC já limita reservas por telefone, mas isso sozinho não protege de números falsos. Para cancelar como cliente, use uma futura rota com OTP ou link assinado; hoje o cancelamento é administrativo. Planeje política de privacidade, retenção/eliminação de PII e monitoramento da fila de falhas conforme a operação real.

## Verificação

```bash
npm test                   # regras de agenda e adapter Google com HTTP simulado
npm run build              # bundle e Service Worker de produção
npm run test:e2e           # Chromium: plataforma, demo, guest/admin, popup, fila e offline
npm run test:merchant      # API fictícia isolada: cadastro/login e criação de duas lojas
npm run test:sql           # PostgreSQL 17 isolado: migration, RPCs, RLS e outbox
```

E2E gera um build `test-demo` separado em `dist-demo/` que força demonstração mesmo com Supabase configurado; não envia reservas ao seu projeto. Usa `/usr/bin/chromium` por padrão neste ambiente. Fora dele, indique `CHROMIUM_PATH` para seu Chromium, ou ajuste Playwright para o browser instalado por `npx playwright install chromium`. Os testes SQL usam um container efêmero sem portas publicadas e sem credenciais de produção. O shim de Auth em `tests/sql/bootstrap.sql` é **somente de teste**, não deve ser aplicado ao Supabase.

O build é servido com `npm run preview -- --port 4173` para validação interna. Para implantar, publique `dist/` em hospedagem estática HTTPS com fallback SPA. Não é necessário Docker para rodar o front-end.

## Módulos

```text
src/components/ui/       Modal, instalação PWA
src/components/booking/  serviços, profissionais, horários e checkout
src/components/admin/    serviços, produtos, popup e reagendamento
src/hooks/               useTenant, useBooking, useTheme
src/services/            Supabase, API, eventos n8n e link Google
src/pages/business/      plataforma, cadastro/login, minhas lojas e criação
src/pages/tenant/        página pública por tenant
src/pages/admin/         painel protegido
src/store/               estado temporário Zustand
src/lib/                 disponibilidade e dados demonstrativos
supabase/migrations/     schema, RLS, RPCs e outbox
supabase/functions/      worker n8n e adapter Google servidor
```

Cada tarefa cloud já é isolada. Use este checkout; não crie um Git worktree para iniciar o projeto. Consulte o status do Git antes de trabalhar. Nenhum commit ou push é feito automaticamente pelo setup.

## Implantação na Vercel

As variáveis deste ambiente cloud não são copiadas automaticamente para a Vercel. Em **Vercel → Project → Settings → Environment Variables**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave pública publishable/anon), tanto em Production quanto em Preview quando usados. Depois faça **Redeploy**, pois o Vite incorpora esses valores no build. Sem elas, a página inicial informa a indisponibilidade de cadastro e a demonstração continua acessível. Nunca coloque `SUPABASE_ACCESS_TOKEN` ou service role no front-end ou nas variáveis `VITE_*`.

A build de produção é `npm run build` e o diretório publicado é `dist/`; não publique `dist-demo` ou `dist-merchant-test`. O arquivo `vercel.json` inclui o fallback SPA necessário para links de lojas, cadastro, login e redefinição de senha.

No Supabase Auth, autorize as URLs de retorno do seu domínio HTTPS, incluindo `/criar-loja` e `/redefinir-senha`. Já foram adicionados os retornos dos deployments `https://safereserve-*-danielrgis-projects.vercel.app` da conta mostrada no print. Para um domínio próprio ou outra conta Vercel, adicione o domínio correspondente sem autorizar todos os projetos `*.vercel.app`. Ajuste Site URL para o domínio definitivo quando definido e configure SMTP para e-mails de produção. Ao atualizar uma instalação PWA existente, aceite o aviso **Atualizar** para carregar a nova versão.

`npm run test:merchant` usa um build com URL e chave fictícias, intercepta todas as chamadas e nunca cria contas ou envia e-mails no projeto real. Testes SQL também validam provisionamento, idempotência, link reservado, vínculo de proprietário e isolamento entre lojas. O fluxo de criação foi exercitado no banco real em uma transação revertida.
