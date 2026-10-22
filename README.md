# SafeReserve

WebApp de agendamento multi-tenant com React 19, Vite, Tailwind 4, Framer Motion, Supabase, Zustand e TanStack Query. Interface em português, mobile-first, tema escuro padrão e PWA.

## Desenvolvimento

Requer Node.js 22.12+ ou 24 LTS (validado com 24.19.0), npm e, apenas para testes SQL, Docker.

```bash
cd /workspace/SafeReserve
npm ci
npm run dev
```

Sem configuração Supabase, o app abre uma **demonstração explícita** do fictício Studio Aurora. Reservas, lista de espera e alterações administrativas ficam em `sessionStorage`, isoladas por sessão/aba. Nenhuma mensagem é enviada. Fechar a sessão pode apagar os dados. Em modo real, falhas Supabase não são substituídas por dados fictícios.

Rotas: `/` ou `/studio-aurora` para clientes; `/admin` ou `/:tenant/admin` para profissionais. Em domínio próprio `slug.seudominio.com`, o subdomínio identifica o tenant; o slug da URL tem prioridade. Configure DNS wildcard e o host estático para devolver `index.html` nas rotas SPA. O slug `studio-aurora` é o padrão da raiz; outros estabelecimentos devem usar seus próprios slugs.

## Conectar ao Supabase

As opções `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` foram adicionadas ao rascunho do ambiente. A URL informada é `https://cgmylsxrjzovgwyrncyv.supabase.co`.

1. **Este projeto já foi configurado:** a migration `202610220001_initial.sql` e o catálogo inicial foram aplicados. Veja `docs/SUPABASE_SETUP.md`; não reaplique a migration. Somente para um projeto novo, aplique a migration pelo SQL Editor ou CLI e, opcionalmente, `supabase/seed.sql`.
2. Nas configurações do ambiente, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a **publishable key** (`sb_publishable_…`) ou a chave pública legada `anon` do projeto. Localmente, copie `.env.example` para `.env.local` e preencha as duas variáveis. Não coloque valores em commits ou no chat.
3. Reinicie o Vite após preencher as variáveis. Para produção, execute um novo `npm run build`: Vite incorpora variáveis públicas no build. Essas duas opções são públicas por definição; a proteção é feita por RLS. **Nunca use `service_role` ou `sb_secret_…` no front-end.**
4. Crie o usuário administrador no Supabase Auth e conceda a função pelo SQL Editor, como proprietário do banco:

```sql
insert into public.memberships (tenant_id, user_id, role)
values ('UUID-DO-TENANT', 'UUID-DO-USUARIO-AUTH', 'admin');
```

O cadastro público nunca atribui papel admin. Configure Site URL, URLs de redirecionamento, confirmação de e-mail e SMTP do Supabase Auth. O upsell pós-reserva usa e-mail e senha (mínimo 8 caracteres); não exige cadastro para reservar. Vinculação automática de uma reserva guest a uma conta posterior exige prova de titularidade e não é feita usando só o telefone.

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
npm run test:e2e           # Chromium: mobile, desktop, guest/admin, popup, fila e offline
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
src/pages/tenant/        página pública por tenant
src/pages/admin/         painel protegido
src/store/               estado temporário Zustand
src/lib/                 disponibilidade e dados demonstrativos
supabase/migrations/     schema, RLS, RPCs e outbox
supabase/functions/      worker n8n e adapter Google servidor
```

Cada tarefa cloud já é isolada. Use este checkout; não crie um Git worktree para iniciar o projeto. Consulte o status do Git antes de trabalhar. Nenhum commit ou push é feito automaticamente pelo setup.
