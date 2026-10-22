import { supabase, configError, unwrap } from './supabase';

function requireConnection() {
  if (!supabase) throw new Error(configError || 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.');
}

export async function ownerShops(userId) {
  requireConnection();
  const memberships = await unwrap(supabase.from('memberships')
    .select('tenant_id,role,tenant:tenants(id,name,slug,active)')
    .eq('user_id', userId).eq('role', 'admin'));
  return memberships.map(m => m.tenant).filter(Boolean);
}

export async function createShop(values) {
  requireConnection();
  return unwrap(supabase.rpc('create_tenant', {
    p_name: values.name.trim(), p_slug: values.slug,
    p_address: values.address.trim(), p_professional_name: values.professional.trim(),
    p_service_name: values.service.trim(), p_price: Math.round(Number(values.price) * 100),
    p_duration: Number(values.duration),
  }));
}
