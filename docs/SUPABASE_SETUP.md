# Supabase configurado

Projeto: `cgmylsxrjzovgwyrncyv`. Configuração aplicada em 22/10/2026 pela API de gerenciamento, usando a credencial do ambiente sem expor seu valor.

## Banco

A migration `202610220001_initial.sql` foi aplicada em uma transação, juntamente com o seed do catálogo inicial. O histórico foi registrado em `supabase_migrations.schema_migrations`, versão `202610220001`, nome `initial`.

Foram confirmadas 11 tabelas com Row Level Security habilitado: `tenants`, `memberships`, `services`, `professionals`, `professional_services`, `customers`, `bookings`, `time_blocks`, `waitlist`, `products` e `integration_outbox`. Há 15 políticas e 12 funções públicas da aplicação, incluindo o provisionamento autenticado de novas lojas. A extensão `btree_gist` suporta a constraint que impede sobreposição de horários.

O catálogo contém um estabelecimento inicial fictício (Studio Aurora), seis serviços e três profissionais. Ele é um ponto de partida, não representa dados reais de uma empresa. Personalize-o antes de divulgar o link. Nenhum cliente ou agendamento de teste foi persistido.

Não reaplique a migration inicial a este banco. Faça alterações futuras em novas migrations e mantenha o histórico sincronizado.

## Verificações executadas no projeto real

- PostgreSQL: criação de reserva, repetição idempotente, rejeição de sobreposição, criação atômica da outbox e bloqueio das operações privadas para `anon`.
- Os testes de escrita usaram uma transação explicitamente revertida. Após os testes: zero clientes, zero reservas e zero eventos pendentes.
- API REST com a chave pública do app: HTTP 200 para estabelecimentos, serviços e profissionais; HTTP 401 para clientes, reservas e outbox.
- Interface mobile em Chromium: catálogo remoto, filtro por profissional e horários reais carregados. O teste visual usou respostas reais retransmitidas pelo transporte Node do Playwright, com validação TLS ativa. Nenhuma confirmação de reserva foi enviada pelo navegador.
- Limitação do teste local: acesso HTTPS direto do Chromium ao Supabase continua rejeitando a CA do proxy (`ERR_CERT_AUTHORITY_INVALID`), mesmo após importação no NSS. A retransmissão usa os certificados confiáveis do ambiente e não desativa TLS nem fornece dados fictícios. O PostgreSQL e a API HTTPS foram validados diretamente.

## Auth

Cadastro por e-mail permanece habilitado e a confirmação de e-mail foi preservada. Foram adicionados, de forma cumulativa, os retornos `http://localhost:5173`, `http://127.0.0.1:5173` e suas subrotas. O Site URL existente foi preservado (`http://localhost:3000`); o domínio HTTPS definitivo deve ser configurado quando a aplicação for publicada.

SMTP personalizado e provider Google ainda não estão configurados. Envio de e-mails em produção exige configurar SMTP. A conta Auth indicada pelo proprietário já recebeu a membership `admin` para o Studio Aurora. A autorização e a leitura da agenda foram verificadas sob o papel `authenticated`. Não atribua acesso ao primeiro usuário que aparecer e não coloque papéis administrativos em `user_metadata`.

## Integrações

As tabelas e funções de fila, lembretes e outbox estão presentes. Mensageria automática ainda exige n8n/Chatwoot, templates WhatsApp e execução do worker por cron; sincronização Google exige OAuth. Essas integrações externas não foram ativadas por esta configuração do banco. Consulte `INTEGRATIONS.md`.


## Cadastro de lojas e links exclusivos

A migration `202610220002_owner_onboarding.sql` foi aplicada e registrada. A função `create_tenant` pode ser chamada apenas por usuários autenticados, valida os campos e o link, cria o catálogo inicial e atribui a membership admin exclusivamente ao chamador. A criação foi validada no PostgreSQL real com rollback; nenhuma loja de teste permaneceu no projeto.

A página inicial agora é da plataforma. `/cadastro` e `/entrar` permitem acessar `/painel` e `/criar-loja`. Cada loja criada tem um endereço `/<slug>` independente do hostname, e o painel permite copiá-lo. `/demonstracao` é local e reservado; nunca aponta para uma loja real.

Os retornos Auth para `https://safereserve-*-danielrgis-projects.vercel.app` e subrotas foram adicionados preservando os anteriores e a confirmação de e-mail. O deploy Vercel precisa receber separadamente as variáveis públicas Supabase; as variáveis da máquina cloud não são transmitidas ao host. As credenciais externas n8n/WhatsApp/Google e SMTP continuam sendo configurações independentes.
