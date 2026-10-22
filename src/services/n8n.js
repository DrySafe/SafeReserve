// Do not put an n8n secret or URL in the browser. A transactional database outbox
// feeds the authenticated integration-worker, which signs server-to-server delivery.
export const bookingEvents = Object.freeze({ created: 'Agendamento_Criado', updated: 'Agendamento_Alterado', cancelled: 'Agendamento_Cancelado', reminder: 'Lembrete_Agendamento', waitlist: 'Lista_Espera_Disponivel' });
