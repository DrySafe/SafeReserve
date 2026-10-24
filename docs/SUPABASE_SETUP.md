# Supabase configurado

Projeto: `cgmylsxrjzovgwyrncyv`. Configuração aplicada em 22/10/2026 pela API de gerenciamento, usando a credencial do ambiente sem expor seu valor.

## Banco

A migration `202610220001_initial.sql` foi aplicada em uma transação, juntamente com o seed do catálogo inicial. O histórico foi registrado em `supabase_migrations.schema_migrations`, versão `202610220001`, nome `initial`.

Foram confirmadas 11 tabelas com Row Level Security habilitado: `tenants`, `memberships`, `services`, `professionals`, `professional_services`, `customers`, `bookings`, `time_blocks`, `waitlist`, `products` e `integration_outbox`. Há 15 políticas públicas iniciais; as migrations posteriores acrescentam as funções e políticas descritas abaixo. O provisionamento autenticado e a personalização por loja foram acrescentados pelas migrations posteriores. A extensão `btree_gist` suporta a constraint que impede sobreposição de horários.

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


## Layout por loja

A migration `202610220003_storefront_appearance.sql` foi aplicada e registrada. A coluna `tenants.appearance` guarda escolhas estruturadas: modelo, cores, tipografia, imagens, textos e visibilidade de seções. A constraint rejeita campos desconhecidos, cores inválidas, tipos incorretos e links inseguros; nenhum HTML ou CSS livre é executado. O grant de edição da coluna continua sujeito à política RLS de administrador do tenant.

Foi criado o bucket **público** `storefront-media`, limitado a JPG/PNG/WebP de 5 MB por arquivo. Três políticas restringem insert/select/delete de objetos autenticados ao administrador da loja cujo UUID inicia o caminho; URLs públicas são destinadas às imagens de apresentação. O aplicativo gera nomes únicos e não sobrescreve arquivos. Imagens substituídas ficam disponíveis para limpeza posterior, evitando quebrar uma versão ainda publicada.

Validação: suíte SQL isolada com dois administradores e tenants distintos, tentativa de edição/upload cruzados, edição anônima e entradas inválidas; escrita autenticada no projeto real foi testada com rollback, preservando a identidade existente. Bucket, coluna, políticas e histórico foram confirmados no projeto. A publicação no front-end depende do novo build/deploy na Vercel.


## Apps por loja e central de atendimentos — 24/10/2026

A migration `202610240001_store_apps_and_management.sql` foi aplicada e registrada. A validação de aparência aceita `faviconUrl` e `icon192Url`, reutilizando o bucket e as políticas de imagem existentes. PNGs com nomes únicos evitam que uma versão instalada retenha o arquivo antigo pelo mesmo URL.

O papel de membership `receptionist` foi adicionado. `is_tenant_operator` permite a administradores e atendentes da loja consultar reservas, cancelar, corrigir o contato e usar disponibilidade/reagendamento. As políticas não concedem acesso ao catálogo privado de outra loja, configurações, clientes, outbox ou memberships alheias. Preço/duração continuam protegidos e a regra de conflito de horários foi preservada.

`management_bookings` valida tenant, datas e filtros, aplica limites de consulta de 366 dias e 50 linhas por página e calcula totais para todo o filtro. `update_booking_contact` aceita apenas nome válido e WhatsApp brasileiro normalizado, atuando na reserva daquele tenant. As funções são executáveis apenas por usuários autenticados; a gestão continua proibida a `anon`.

Validação: suíte SQL isolada com 52 reservas, paginação, totais, permissões de atendente, tentativa de acesso cruzado, alteração de contato, disponibilidade e reagendamento/cancelamento. No projeto real, histórico, funções e validação de ícones foram confirmados; consulta autenticada da gestão testada com rollback. Manifestos reais de cliente e gestão retornaram HTTP 200 com nome, ID, escopo e caminho da loja corretos, sem gravar dados de teste.

A Vercel deve publicar também `api/manifest.js`, além de `dist/`. O runtime da função precisa das mesmas duas variáveis públicas usadas no build. O endpoint só consulta a identidade pública via RLS; nunca usa `service_role`. No ambiente cloud, Node 24 precisa de `NODE_USE_ENV_PROXY=1` para testes desse endpoint com dados remotos, preservando o proxy e a CA do ambiente. Isso não é necessário no runtime normal da Vercel.
