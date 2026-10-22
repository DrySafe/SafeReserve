import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const required = (key: string) => { const value = Deno.env.get(key); if (!value) throw new Error(`Missing ${key}`); return value; };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
async function digest(value: string) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function equal(a: string, b: string) { const x = await digest(a), y = await digest(b); let diff = 0; for(let i=0;i<x.length;i++) diff |= x[i]^y[i]; return diff===0; }
async function sign(value: string, secret: string) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req => {
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 try {
  if(!await equal(req.headers.get('Authorization')||'',`Bearer ${required('WORKER_SECRET')}`)) return json({error:'Unauthorized'},401);
  const endpoint=new URL(required('N8N_WEBHOOK_URL'));
  if(endpoint.protocol!=='https:') throw new Error('HTTPS webhook required');
  const signingSecret=required('N8N_WEBHOOK_SECRET');
  const db=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
  const {error:reminderError}=await db.rpc('enqueue_reminders'); if(reminderError) throw reminderError;
  const {error:waitlistError}=await db.rpc('enqueue_waitlist_offers'); if(waitlistError) throw waitlistError;
  const {data:events,error}=await db.rpc('claim_integration_events',{p_limit:20}); if(error) throw error;
  let delivered=0,failed=0;
  for(const event of events||[]) {
   try {
    if(event.event_type==='Lista_Espera_Disponivel') {
     const {data:entry,error:entryError}=await db.from('waitlist').select('status').eq('tenant_id',event.tenant_id).eq('id',event.payload.waitlist_id).single();
     if(entryError) throw entryError;
     if(entry.status!=='notified'||new Date(event.payload.expires_at).getTime()<=Date.now()){
      const {error:e}=await db.from('integration_outbox').update({delivered_at:new Date().toISOString(),locked_until:null}).eq('id',event.id);if(e)throw e;continue;
     }
    }
    // Cancelled or rescheduled bookings invalidate queued reminders and stale created/updated events.
    if(['Lembrete_Agendamento','Agendamento_Criado','Agendamento_Alterado'].includes(event.event_type)) {
     const {data:booking,error:readError}=await db.from('bookings').select('version,status').eq('tenant_id',event.tenant_id).eq('id',event.payload.booking_id).single();
     if(readError) throw readError;
     if(booking.version!==event.payload.version||booking.status!=='confirmed') {
      const {error:e}=await db.from('integration_outbox').update({delivered_at:new Date().toISOString(),locked_until:null}).eq('id',event.id); if(e) throw e; continue;
     }
    }
    const timestamp=String(Math.floor(Date.now()/1000));
    const body=JSON.stringify({event_id:event.id,event:event.event_type,tenant_id:event.tenant_id,data:event.payload});
    const signature=await sign(`${timestamp}.${body}`,signingSecret);
    const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','Authorization':`Bearer ${signingSecret}`,'X-SafeReserve-Timestamp':timestamp,'X-SafeReserve-Signature':signature,'Idempotency-Key':event.id},body,signal:AbortSignal.timeout(12_000)});
    if(!response.ok) throw new Error('Webhook rejected');
    const {error:e}=await db.from('integration_outbox').update({delivered_at:new Date().toISOString(),locked_until:null}).eq('id',event.id);if(e)throw e;
    delivered++;
   } catch {
    failed++;
    const {error:e}=await db.from('integration_outbox').update({locked_until:null,next_attempt_at:new Date(Date.now()+Math.min(3600,15*2**event.attempts)*1000).toISOString()}).eq('id',event.id); if(e)throw e;
   }
  }
  return json({delivered,failed});
 } catch { return json({error:'Worker failed. Check server configuration and outbox retry metadata.'},500); }
});
