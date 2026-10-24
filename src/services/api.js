import { validateAppearance } from '../lib/appearance';
import { supabase, isDemoTenant, configError, unwrap } from './supabase';
import { demoTenant, demoServices, demoProfessionals } from '../lib/demo';
import { demoAvailability, compatibleProfessionals, dateKey } from '../lib/availability';
const read = (key, fallback) => { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, data) => sessionStorage.setItem(key, JSON.stringify(data));
const demoBookings = () => read('sr:demo:bookings', []);
async function fetchStudio(slug) {
  if (slug === 'demonstracao') {
    return { tenant: { ...read('sr:demo:tenant', demoTenant), id: 'demo', slug: 'demonstracao' }, services: read('sr:demo:services', demoServices), professionals: demoProfessionals };
  }
  if (configError || !supabase) throw new Error('Este espaço está temporariamente indisponível. Tente novamente mais tarde.');
  const tenant = await unwrap(supabase.from('tenants').select('*').eq('slug', slug).eq('active', true).maybeSingle());
  if (!tenant) throw new Error('Estabelecimento não encontrado.');
  const [services, pros, skills] = await Promise.all([
    unwrap(supabase.from('services').select('*').eq('tenant_id', tenant.id).eq('active', true).order('name')),
    unwrap(supabase.from('professionals').select('*').eq('tenant_id', tenant.id).eq('active', true).order('name')),
    unwrap(supabase.from('professional_services').select('professional_id,service_id').eq('tenant_id', tenant.id)),
  ]);
  return { tenant, services, professionals: pros.map(p => ({ ...p, service_ids: skills.filter(s => s.professional_id === p.id).map(s => s.service_id) })) };
}
export async function getAvailability({ tenant, date, serviceIds, professionalId, services, professionals }) {
  if (!serviceIds.length) return [];
  if (isDemoTenant(tenant.id)) return demoAvailability({ date, duration: services.filter(s => serviceIds.includes(s.id)).reduce((n,s) => n+s.duration,0), professionals: compatibleProfessionals(professionals, serviceIds).filter(p => !professionalId || p.id === professionalId), bookings: demoBookings() });
  return unwrap(supabase.rpc('available_slots', { p_tenant: tenant.id, p_date: date, p_services: serviceIds, p_professional: professionalId || null }));
}
export async function createBooking({ tenant, serviceIds, slot, name, phone, requestKey, services, professionals }) {
  if (!navigator.onLine) throw new Error('Você está offline. Reconecte para confirmar um horário atualizado.');
  if (!isDemoTenant(tenant.id)) return unwrap(supabase.rpc('create_booking', { p_tenant: tenant.id, p_services: serviceIds, p_professional: slot.professional_id, p_starts: slot.starts_at, p_name: name.trim(), p_phone: phone, p_request_key: requestKey }));
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
  if (isDemoTenant(tenantId)) { write('sr:demo:waitlist', [...read('sr:demo:waitlist', []), { serviceIds, professionalId, date, name, phone }]); return; }
  await unwrap(supabase.rpc('join_waitlist', { p_tenant: tenantId, p_services: serviceIds, p_professional: professionalId || null, p_date: date, p_name: name, p_phone: phone }));
}
export async function adminBookings(tenantId) {
  if (isDemoTenant(tenantId)) return demoBookings();
  return unwrap(supabase.from('bookings').select('*').eq('tenant_id',tenantId).order('starts_at').limit(200));
}
export async function saveService(tenantId, service) {
  if (isDemoTenant(tenantId)) { const all = read('sr:demo:services', demoServices); write('sr:demo:services', all.map(s => s.id === service.id ? service : s)); return; }
  const { name, description, price, duration, photo_url } = service;
  await unwrap(supabase.from('services').update({ name, description, price, duration, photo_url }).eq('tenant_id',tenantId).eq('id',service.id));
}
export async function savePopup(tenantId, popup) {
  if (isDemoTenant(tenantId)) { write('sr:demo:tenant', { ...read('sr:demo:tenant', demoTenant), popup }); return; }
  await unwrap(supabase.from('tenants').update({ popup }).eq('id',tenantId));
}
export async function updateBooking(tenantId, id, changes) {
  if (isDemoTenant(tenantId)) { write('sr:demo:bookings', demoBookings().map(b => b.id === id ? {...b,...changes} : b)); return; }
  await unwrap(supabase.from('bookings').update(changes).eq('tenant_id',tenantId).eq('id',id));
}
export async function loadProducts(tenantId) {
  if(isDemoTenant(tenantId)) return read('sr:demo:products', []);
  return unwrap(supabase.from('products').select('*').eq('tenant_id',tenantId).order('name'));
}
export async function saveProduct(tenantId, product) {
  if(isDemoTenant(tenantId)){const all=read('sr:demo:products',[]);const entry={...product,id:product.id||crypto.randomUUID(),tenant_id:tenantId};write('sr:demo:products',[...all.filter(p=>p.id!==entry.id),entry]);return;}
  const {id,name,description,price,photo_url,active}=product;
  await unwrap(supabase.from('products').upsert({...(id?{id}:{}),tenant_id:tenantId,name,description,price,photo_url,active}));
}
export async function rescheduleBooking(tenantId, booking, slot) {
 if(isDemoTenant(tenantId)){const available=await getRescheduleAvailability({tenant:{id:tenantId},booking,date:slot.starts_at.slice(0,10),professionalId:slot.professional_id});if(!available.some(s=>s.starts_at===slot.starts_at))throw new Error('Horário indisponível. Atualize a agenda.');const duration=new Date(booking.ends_at)-new Date(booking.starts_at);write('sr:demo:bookings',demoBookings().map(b=>b.id===booking.id?{...b,professional_id:slot.professional_id,starts_at:slot.starts_at,ends_at:new Date(new Date(slot.starts_at).getTime()+duration).toISOString()}:b));return;}
 await unwrap(supabase.rpc('reschedule_booking',{p_tenant:tenantId,p_booking:booking.id,p_professional:slot.professional_id,p_starts:slot.starts_at}));
}

export async function getRescheduleAvailability({tenant,booking,date,professionalId}) {
 if(isDemoTenant(tenant.id))return demoAvailability({date,duration:(new Date(booking.ends_at)-new Date(booking.starts_at))/60000,professionals:demoProfessionals.filter(p=>p.id===professionalId&&booking.service_ids.every(id=>p.service_ids.includes(id))),bookings:demoBookings().filter(b=>b.id!==booking.id)});
 return unwrap(supabase.rpc('available_slots',{p_tenant:tenant.id,p_date:date,p_services:booking.service_ids,p_professional:professionalId,p_exclude:booking.id}));
}

// Persist only the public catalog. Availability, auth and customer data are never cached here.
export async function loadStudio(slug) {
 const key=`sr:public-catalog:${slug}`;
 if(slug!=='demonstracao'&&!navigator.onLine){
  try{const cached=JSON.parse(localStorage.getItem(key));if(cached&&Date.now()-cached.savedAt<86400000)return cached.studio;}catch{}
  throw new Error('Você está offline. Abra este espaço com conexão para carregar os serviços.');
 }
 const studio=await fetchStudio(slug);
 if(slug!=='demonstracao'){try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),studio}));}catch{}}
 return studio;
}

export async function saveAppearance(tenantId,appearance) {
 const value=validateAppearance(appearance,{allowData:isDemoTenant(tenantId)});
 if(isDemoTenant(tenantId)) {
  try{write('sr:demo:tenant',{...read('sr:demo:tenant',demoTenant),appearance:value});}
  catch{throw new Error('Não foi possível salvar a demonstração. Use imagens menores ou URLs HTTPS.');}
  return value;
 }
 const result=await unwrap(supabase.from('tenants').update({appearance:value}).eq('id',tenantId).select('appearance').single());
 return result.appearance;
}

export async function managementBookings(tenant,filters) {
 const {from,until,search='',professional='',status='',offset=0}=filters;
 if(!from||!until||until<from||(new Date(until)-new Date(from))/86400000>365)throw new Error('Escolha um período válido de até 366 dias.');
 if(isDemoTenant(tenant.id)){
  const rows=demoBookings().filter(b=>{const day=dateKey(new Date(b.starts_at),tenant.timezone);return day>=from&&day<=until&&(!professional||b.professional_id===professional)&&(!status||b.status===status)&&(!search||b.name.toLowerCase().includes(search.toLowerCase())||/^[+\d()\s-]+$/.test(search)&&search.replace(/\D/g,'')&&b.phone.includes(search.replace(/\D/g,'')));}).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.id.localeCompare(b.id));
  return {rows:rows.slice(offset,offset+50),total:rows.length,confirmed:rows.filter(b=>b.status==='confirmed').length,cancelled:rows.filter(b=>b.status==='cancelled').length,revenue:rows.filter(b=>b.status==='confirmed').reduce((sum,b)=>sum+b.total,0)};
 }
 return unwrap(supabase.rpc('management_bookings',{p_tenant:tenant.id,p_from:from,p_until:until,p_search:search,p_professional:professional||null,p_status:status,p_offset:offset}));
}
export async function updateBookingContact(tenantId,bookingId,name,phone) {
 if(isDemoTenant(tenantId)){write('sr:demo:bookings',demoBookings().map(b=>b.id===bookingId?{...b,name:name.trim(),phone}:b));return;}
 await unwrap(supabase.rpc('update_booking_contact',{p_tenant:tenantId,p_booking:bookingId,p_name:name.trim(),p_phone:phone}));
}
export async function managementTeam(tenantId) {
 if(isDemoTenant(tenantId))return demoProfessionals;
 return unwrap(supabase.from('professionals').select('id,name,active').eq('tenant_id',tenantId).order('name'));
}
