# Supabase configurado

Projeto: `cgmylsxrjzovgwyrncyv`. Configuração aplicada em 22/10/2026 pela API de gerenciamento, usando a credencial do ambiente sem expor seu valor.

## Banco

A migration `202610220001_initial.sql` foi aplicada em uma transação, juntamente com o seed do catálogo inicial. O histórico foi registrado em `supabase_migrations.schema_migrations`, versão `202610220001`, nome `initial`.

Foram confirmadas 11 tabelas com Row Level Security habilitado: `tenants`, `memberships`, `services`, `professionals`, `professional_services`, `customers`, `bookings`, `time_blocks`, `waitlist`, `products` e `integration_outbox`. Há 15 políticas e 11 funções públicas da aplicação. A extensão `btree_gist` suporta a constraint que impede sobreposição de horários.

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
