import { supabase, isDemo, configError, unwrap } from './supabase';
import { demoTenant, demoServices, demoProfessionals } from '../lib/demo';
import { demoAvailability, compatibleProfessionals } from '../lib/availability';
const read = (key, fallback) => { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, data) => sessionStorage.setItem(key, JSON.stringify(data));
const demoBookings = () => read('sr:demo:bookings', []);
async function fetchStudio(slug) {
  if (configError) throw new Error(configError);
  if (isDemo) {
    if (slug !== demoTenant.slug) throw new Error('Estabelecimento não encontrado.');
    return { tenant: read('sr:demo:tenant', demoTenant), services: read('sr:demo:services', demoServices), professionals: demoProfessionals };
  }
  const tenant = await unwrap(supabase.from('tenants').select('*').eq('slug', slug).eq('active', true).single());
  const [services, pros, skills] = await Promise.all([
    unwrap(supabase.from('services').select('*').eq('tenant_id', tenant.id).eq('active', true).order('name')),
    unwrap(supabase.from('professionals').select('*').eq('tenant_id', tenant.id).eq('active', true).order('name')),
    unwrap(supabase.from('professional_services').select('professional_id,service_id').eq('tenant_id', tenant.id)),
  ]);
  return { tenant, services, professionals: pros.map(p => ({ ...p, service_ids: skills.filter(s => s.professional_id === p.id).map(s => s.service_id) })) };
}
export async function getAvailability({ tenant, date, serviceIds, professionalId, services, professionals }) {
  if (!serviceIds.length) return [];
  if (isDemo) return demoAvailability({ date, duration: services.filter(s => serviceIds.includes(s.id)).reduce((n,s) => n+s.duration,0), professionals: compatibleProfessionals(professionals, serviceIds).filter(p => !professionalId || p.id === professionalId), bookings: demoBookings() });
  return unwrap(supabase.rpc('available_slots', { p_tenant: tenant.id, p_date: date, p_services: serviceIds, p_professional: professionalId || null }));
}
export async function createBooking({ tenant, serviceIds, slot, name, phone, requestKey, services, professionals }) {
  if (!navigator.onLine) throw new Error('Você está offline. Reconecte para confirmar um horário atualizado.');
  if (!isDemo) return unwrap(supabase.rpc('create_booking', { p_tenant: tenant.id, p_services: serviceIds, p_professional: slot.professional_id, p_starts: slot.starts_at, p_name: name.trim(), p_phone: phone, p_request_key: requestKey }));
  const existing = demoBookings();
  const prior = existing.find(b => b.request_key === requestKey); if (prior) return prior;
  const available = await getAvailability({ tenant, date: slot.starts_at.slice(0,10), serviceIds, professionalId: slot.professional_id, services, professionals });
  if (!available.some(s => s.starts_at === slot.starts_at)) throw new Error('Este horário acabou de ser reservado. Escolha outro.');
  const duration = services.filter(s => serviceIds.includes(s.id)).reduce((n,s) => n+s.duration,0);
  const booking = { id: crypto.randomUUID(), request_key: requestKey, tenant_id: tenant.id, professional_id: slot.professional_id, starts_at: slot.starts_at, ends_at: new Date(new Date(slot.starts_at).getTime()+duration*60000).toISOString(), service_ids: serviceIds, service_snapshot: services.filter(s=>serviceIds.includes(s.id)), name: name.trim(), phone, status: 'confirmed', total: services.filter(s => serviceIds.includes(s.id)).reduce((n,s)=>n+s.price,0) };
  write('sr:demo:bookings', [...existing, booking]); return booking;
}
export async function joinWaitlist({ tenantId, serviceIds, professionalId, date, name, phone }) {
  if (!navigator.onLine) throw new Error('Reconecte para entrar na lista de espera.');
  if (isDemo) { write('sr:demo:waitlist', [...read('sr:demo:waitlist', []), { serviceIds, professionalId, date, name, phone }]); return; }
  await unwrap(supabase.rpc('join_waitlist', { p_tenant: tenantId, p_services: serviceIds, p_professional: professionalId || null, p_date: date, p_name: name, p_phone: phone }));
}
export async function adminBookings(tenantId) {
  if (isDemo) return demoBookings();
  return unwrap(supabase.from('bookings').select('*').eq('tenant_id',tenantId).order('starts_at').limit(200));
}
export async function saveService(tenantId, service) {
  if (isDemo) { const all = read('sr:demo:services', demoServices); write('sr:demo:services', all.map(s => s.id === service.id ? service : s)); return; }
  const { name, description, price, duration, photo_url } = service;
  await unwrap(supabase.from('services').update({ name, description, price, duration, photo_url }).eq('tenant_id',tenantId).eq('id',service.id));
}
export async function savePopup(tenantId, popup) {
  if (isDemo) { write('sr:demo:tenant', { ...read('sr:demo:tenant', demoTenant), popup }); return; }
  await unwrap(supabase.from('tenants').update({ popup }).eq('id',tenantId));
}
export async function updateBooking(tenantId, id, changes) {
  if (isDemo) { write('sr:demo:bookings', demoBookings().map(b => b.id === id ? {...b,...changes} : b)); return; }
  await unwrap(supabase.from('bookings').update(changes).eq('tenant_id',tenantId).eq('id',id));
}
export async function loadProducts(tenantId) {
  if(isDemo) return read('sr:demo:products', []);
  return unwrap(supabase.from('products').select('*').eq('tenant_id',tenantId).order('name'));
}
export async function saveProduct(tenantId, product) {
  if(isDemo){const all=read('sr:demo:products',[]);const entry={...product,id:product.id||crypto.randomUUID(),tenant_id:tenantId};write('sr:demo:products',[...all.filter(p=>p.id!==entry.id),entry]);return;}
  const {id,name,description,price,photo_url,active}=product;
  await unwrap(supabase.from('products').upsert({...(id?{id}:{}),tenant_id:tenantId,name,description,price,photo_url,active}));
}
export async function rescheduleBooking(tenantId, booking, slot) {
 if(isDemo){const available=await getRescheduleAvailability({tenant:{id:tenantId},booking,date:slot.starts_at.slice(0,10),professionalId:slot.professional_id});if(!available.some(s=>s.starts_at===slot.starts_at))throw new Error('Horário indisponível. Atualize a agenda.');const duration=new Date(booking.ends_at)-new Date(booking.starts_at);write('sr:demo:bookings',demoBookings().map(b=>b.id===booking.id?{...b,professional_id:slot.professional_id,starts_at:slot.starts_at,ends_at:new Date(new Date(slot.starts_at).getTime()+duration).toISOString()}:b));return;}
 await unwrap(supabase.rpc('reschedule_booking',{p_tenant:tenantId,p_booking:booking.id,p_professional:slot.professional_id,p_starts:slot.starts_at}));
}

export async function getRescheduleAvailability({tenant,booking,date,professionalId}) {
 if(isDemo)return demoAvailability({date,duration:(new Date(booking.ends_at)-new Date(booking.starts_at))/60000,professionals:demoProfessionals.filter(p=>p.id===professionalId&&booking.service_ids.every(id=>p.service_ids.includes(id))),bookings:demoBookings().filter(b=>b.id!==booking.id)});
 return unwrap(supabase.rpc('available_slots',{p_tenant:tenant.id,p_date:date,p_services:booking.service_ids,p_professional:professionalId,p_exclude:booking.id}));
}

// Persist only the public catalog. Availability, auth and customer data are never cached here.
export async function loadStudio(slug) {
 const key=`sr:public-catalog:${slug}`;
 if(!isDemo&&!navigator.onLine){
  try{const cached=JSON.parse(localStorage.getItem(key));if(cached&&Date.now()-cached.savedAt<86400000)return cached.studio;}catch{}
  throw new Error('Você está offline. Abra este espaço com conexão para carregar os serviços.');
 }
 const studio=await fetchStudio(slug);
 if(!isDemo){try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),studio}));}catch{}}
 return studio;
}
