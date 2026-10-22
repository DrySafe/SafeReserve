# Ativação das integrações

O aplicativo e o banco são independentes de WhatsApp. A reserva grava um evento na `integration_outbox` **na mesma transação**. Uma falha no n8n não perde a reserva. Não há URLs nem tokens do n8n, Chatwoot ou Google no bundle do navegador.

## Supabase → n8n

1. Aplique a migration. Implante `supabase functions deploy integration-worker`.
2. Nas **Edge Function Secrets** do Supabase, configure `WORKER_SECRET` (aleatório de alta entropia), `N8N_WEBHOOK_URL` (HTTPS de produção) e `N8N_WEBHOOK_SECRET`. A plataforma Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` à função. Não adicione a service role a nenhuma variável `VITE_*`.
3. Crie um Webhook POST no n8n com Header Auth: nome `Authorization`, valor `Bearer <N8N_WEBHOOK_SECRET>`. Configure a resposta **depois** de terminar o processamento. Em caso de falha, retorne status não 2xx para permitir nova tentativa. Nunca responda 200 antes de persistir/terminar o trabalho.
4. Um cron confiável deve fazer POST a `/functions/v1/integration-worker` a cada minuto, com `Authorization: Bearer <WORKER_SECRET>`. Guarde esse segredo em credenciais do n8n ou Supabase Vault; não o escreva num SQL versionado. Se usar o próprio n8n para cron, configure a concorrência para evitar sobreposição. As leases do banco também evitam consumo simultâneo do mesmo lote.
5. O worker envia `event_id`, `event`, `tenant_id` e `data`. Os eventos são `Agendamento_Criado`, `Agendamento_Alterado`, `Agendamento_Cancelado`, `Lembrete_Agendamento` e `Lista_Espera_Disponivel`.

O worker também assina `HMAC-SHA256(timestamp + "." + corpo JSON original)` com `N8N_WEBHOOK_SECRET`, nos headers `X-SafeReserve-Timestamp` e `X-SafeReserve-Signature`. Se validar HMAC no receptor, use o **corpo bruto**, comparação em tempo constante e tolerância de 5 minutos. O Header Auth obrigatório já protege a entrada; não remova a autenticação por não usar HMAC.

Use `event_id` como chave de deduplicação persistente no consumidor e processe os eventos de um agendamento em ordem de `data.version`. O envio é **pelo menos uma vez**, não exatamente uma vez: uma resposta perdida depois do envio ao WhatsApp pode causar repetição. Use uma tabela de recibos durável no n8n e conciliação de mensagens no Chatwoot. O worker usa backoff exponencial até 12 tentativas. Monitore eventos sem `delivered_at` com `attempts >= 12`; após corrigir o problema, reative esses eventos explicitamente no servidor. Os logs não devem guardar corpos contendo telefone ou tokens.

## n8n → Chatwoot → WhatsApp

Configure credenciais HTTP Header Auth `api_access_token` no n8n, restritas à instância Chatwoot. Mantenha um mapeamento **privado e confiável** de `tenant_id → account_id + inbox_id + slug + timezone + templates`. Não aceite IDs de conta ou inbox vindos do navegador. Para múltiplas instâncias, use credenciais separadas por instância.

O workflow HTTP de referência deve executar estas etapas:

1. Validar autenticação, formato do evento e tenant no mapeamento privado. Tenant desconhecido deve falhar; nunca use um inbox padrão de outro tenant.
2. Consultar recibo de `event_id` e ignorar se já concluído. Para eventos de agenda, conferir a versão atual antes de executar uma tentativa antiga.
3. `GET /api/v1/accounts/{account_id}/contacts/search?q={phone}`. Se não existir um contato com **telefone exatamente igual**, `POST /contacts` com `{ "name": data.name, "phone_number": data.phone, "inbox_id": inbox_id }`.
4. `GET /api/v1/accounts/{account_id}/contacts/{contact_id}/conversations`. Reutilizar a conversa no inbox correto; se não houver, `POST /conversations` com `{ "contact_id": contact_id, "inbox_id": inbox_id, "status": "open" }`.
5. `POST /conversations/{conversation_id}/messages` com `{ "content": texto, "message_type": "outgoing", "private": false }`. Isso envia uma mensagem ao cliente e a registra no histórico do inbox, sem exigir uma ação do operador. **Uma nota `private: true` não envia WhatsApp.**
6. Para notificações fora da janela de atendimento do WhatsApp, enviar um template aprovado e configurar `template_params` conforme o provider/inbox do Chatwoot. Uma mensagem de texto comum não substitui template aprovado. Aprovar templates de confirmação, alteração, cancelamento, lembrete e vaga disponível.
7. Só gravar o recibo de conclusão e responder 2xx depois de processar os efeitos; registrar estados intermediários por etapa para retomar parcialmente sem repetir efeitos já concluídos.

Exemplos de texto: “Olá, {nome}! Seu horário no {empresa} está confirmado para {data}, às {hora}.” e “Uma vaga ficou disponível! Escolha seu horário em https://SEU-DOMINIO/{slug}.” Formate datas no `timezone` do tenant; use uma URL de origem configurada, nunca um Host recebido livremente.

## Lista de espera e lembretes

O worker consulta a fila a cada execução, inclusive após cancelamentos. Gera uma oferta para o primeiro cliente compatível com uma vaga real, em ordem de entrada, com um convite ativo por estabelecimento/dia. Depois de 15 minutos sem reserva, a oferta expira e a próxima pessoa pode ser convidada. A oferta **não bloqueia** o horário: a confirmação sempre consulta o banco. O agendamento marca as entradas compatíveis desse telefone/dia como concluídas. Não se pode garantir a identidade do titular só pelo telefone: antes de oferecer autoatendimento de alteração/cancelamento, implementar verificação por OTP ou link assinado.

Lembretes entram na outbox de 120 a 115 minutos antes do início, com uma chave por versão. Um reagendamento invalida lembretes antigos. Rodar o worker uma vez por minuto e monitorar falhas; uma interrupção maior que essa janela pode perder o lembrete, mas nunca a reserva.

## Google Calendar

O botão pós-reserva abre um evento preenchido para confirmação manual pelo cliente. Ele já funciona sem credenciais Google do SaaS.

A sincronização **automática nas três agendas ainda exige configurar OAuth e o workflow**. Não está ativada apenas por preencher as chaves Supabase. O adapter servidor em `supabase/functions/_shared/google-calendar.ts` implementa refresh de token e criação, atualização e exclusão idempotentes via Calendar API e tem testes com respostas HTTP simuladas.

No workflow n8n, a partir dos eventos criado/alterado/cancelado:

- Obter a conexão OAuth do estabelecimento e do profissional a partir do `tenant_id` e `professional_id` confiáveis. As agendas podem ser compartilhadas com uma credencial autorizada ou ter conexões separadas.
- Para um cliente autenticado, usar `data.user_id` **somente após ele conectar explicitamente sua conta Google**. Criar senha não concede acesso à agenda Google. Não use um e-mail fornecido no checkout como prova de consentimento.
- Solicitar o escopo mínimo `https://www.googleapis.com/auth/calendar.events`, fluxo Authorization Code com `state`, redirect URI exata, consentimento e acesso offline. Guardar refresh tokens criptografados num serviço de credenciais/Vault. Nunca usar `user_metadata` para autorizar acesso administrativo.
- Aplicar o mesmo evento estável (UUID sem hífens, base32hex compatível) às agendas do cliente autorizado, do profissional e do estabelecimento. O adapter omite nome/telefone do cliente nos detalhes públicos por padrão.
- Tratar revogação/401 como reconexão necessária; não confirmar sincronização que falhou. Manter a reserva e repetir a etapa Google independentemente da etapa WhatsApp.

Ainda são necessários o projeto OAuth do Google, os IDs das agendas, as credenciais Chatwoot, o provider WhatsApp e a URL/credenciais n8n. Nenhum desses serviços foi acionado durante os testes locais.

## Workflow de referência importável

`integrations/n8n/whatsapp.workflow.json` contém o caminho Webhook → contato → conversa → template WhatsApp → resposta. Ele é exportado **inativo**, sem credenciais. Não foi executado contra uma instância n8n/Chatwoot neste ambiente.

Ao importar:

1. Atribua ao Webhook a credencial Header Auth `Authorization: Bearer <N8N_WEBHOOK_SECRET>`.
2. Atribua aos nós HTTP Request a credencial Chatwoot Header Auth `api_access_token`. O exemplo pressupõe uma instância Chatwoot com acesso autorizado às contas mapeadas; use workflows/credenciais separados para instâncias distintas.
3. Configure a variável n8n `SAFERESERVE_TENANTS` com um JSON privado de configuração (sem tokens):

```json
{
  "11111111-1111-4111-8111-111111111111": {
    "name": "Studio Aurora",
    "timezone": "America/Sao_Paulo",
    "chatwoot_origin": "https://CHATWOOT.SEU-DOMINIO.com",
    "account_id": 1,
    "inbox_id": 2,
    "booking_url": "https://APP.SEU-DOMINIO.com/studio-aurora",
    "templates": {
      "Agendamento_Criado": {"name":"reserva_confirmada","parameters":["name","studio","date","time"]},
      "Agendamento_Alterado": {"name":"reserva_alterada","parameters":["name","studio","date","time"]},
      "Agendamento_Cancelado": {"name":"reserva_cancelada","parameters":["name","studio","date","time"]},
      "Lembrete_Agendamento": {"name":"lembrete_reserva","parameters":["name","studio","date","time"]},
      "Lista_Espera_Disponivel": {"name":"vaga_disponivel","parameters":["name","booking_url"]}
    }
  }
}
```

Use os nomes, idiomas e ordem dos parâmetros dos seus templates aprovados. O exemplo recusa um evento sem template configurado. Não ative o workflow antes de configurar os tenants e credenciais.

O fluxo faz deduplicação adicional nas mensagens recentes da conversa pelo atributo `safereserve_event_id`. Isso **não substitui** o recibo persistente descrito acima: paginação, concorrência ou muitas mensagens posteriores podem escapar dessa verificação. Configure limite de concorrência e acrescente recibos duráveis por etapa no seu n8n antes de produção. Teste primeiro com um inbox de homologação e valide respostas/estruturas da versão instalada do Chatwoot.
