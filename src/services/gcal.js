// Explicit user action for guests; automatic synchronization is handled server-side by n8n + OAuth.
export function googleCalendarLink({ tenant, booking, services }) {
  const compact = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `${services.map(s=>s.name).join(' + ')} · ${tenant.name}`, dates: `${compact(booking.starts_at)}/${compact(booking.ends_at)}`, location: tenant.address, details: `Agendamento ${booking.id} · SafeReserve`, ctz: tenant.timezone });
  return `https://calendar.google.com/calendar/render?${params}`;
}
